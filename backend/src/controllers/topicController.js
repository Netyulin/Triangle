import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeString, serializeTopic } from '../utils/serializers.js';

const topicStatuses = ['draft', 'published', 'archived'];

const listValidation = validate([query('status').optional().isIn(topicStatuses).withMessage('status is invalid')]);

const writeValidationRules = [
  body('slug').optional().trim().notEmpty().withMessage('slug is required'),
  body('title').optional().trim().notEmpty().withMessage('title is required'),
  body('description').optional().trim().notEmpty().withMessage('description is required'),
  body('status').optional().isIn(topicStatuses).withMessage('status is invalid'),
  body('relatedAppSlugs').optional().isArray().withMessage('relatedAppSlugs must be an array'),
  body('relatedPostSlugs').optional().isArray().withMessage('relatedPostSlugs must be an array')
];

const createValidation = validate([
  body('slug').trim().notEmpty().withMessage('slug is required'),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('description').trim().notEmpty().withMessage('description is required'),
  ...writeValidationRules
]);

const updateValidation = validate(writeValidationRules);
const slugParamValidation = validate([param('slug').trim().notEmpty().withMessage('slug is required')]);

export { listValidation, createValidation, updateValidation, slugParamValidation };

function includeTopicRelations() {
  return {
    relatedApps: {
      include: {
        app: {
          include: {
            author: { select: { id: true, username: true, name: true, avatar: true, role: true } }
          }
        }
      }
    },
    relatedPosts: {
      include: {
        post: {
          include: {
            relatedApp: { select: { slug: true, name: true, icon: true, subtitle: true } }
          }
        }
      }
    }
  };
}

function buildRelationData(appSlugs, postSlugs) {
  const data = {};
  if (Array.isArray(appSlugs)) data.relatedApps = { create: appSlugs.map((appSlug) => ({ appSlug })) };
  if (Array.isArray(postSlugs)) data.relatedPosts = { create: postSlugs.map((postSlug) => ({ postSlug })) };
  return data;
}

function patchTopicData(current, body) {
  return {
    slug: body.slug ? normalizeString(body.slug).trim() : current.slug,
    title: body.title !== undefined ? normalizeString(body.title).trim() : current.title,
    description: body.description !== undefined ? normalizeString(body.description).trim() : current.description,
    coverImage: body.coverImage !== undefined ? normalizeString(body.coverImage, '') : current.coverImage,
    status: body.status !== undefined ? normalizeString(body.status).trim() : current.status
  };
}

export async function list(req, res) {
  const where = {};
  if (req.user && req.query.status) where.status = normalizeString(req.query.status).trim();
  else if (!req.user) where.status = 'published';
  const topics = await prisma.topic.findMany({ where, orderBy: [{ createdAt: 'desc' }], include: includeTopicRelations() });
  return sendSuccess(res, topics.map(serializeTopic));
}

export async function all(req, res) {
  const topics = await prisma.topic.findMany({ where: { status: 'published' }, orderBy: [{ createdAt: 'desc' }] });
  return sendSuccess(res, topics);
}

export async function detail(req, res) {
  const topic = await prisma.topic.findUnique({ where: { slug: req.params.slug }, include: includeTopicRelations() });
  if (!topic) return sendError(res, ErrorCodes.TOPIC_NOT_FOUND, 'topic not found');
  if (!req.user && topic.status !== 'published') {
    return sendError(res, ErrorCodes.TOPIC_NOT_FOUND, 'topic not found');
  }
  return sendSuccess(res, serializeTopic(topic));
}

export async function create(req, res) {
  const slug = normalizeString(req.body.slug).trim();
  const existed = await prisma.topic.findUnique({ where: { slug } });
  if (existed) return sendError(res, ErrorCodes.SLUG_EXISTS, 'slug already exists');
  const topic = await prisma.topic.create({
    data: {
      slug,
      title: normalizeString(req.body.title).trim(),
      description: normalizeString(req.body.description).trim(),
      coverImage: normalizeString(req.body.coverImage, ''),
      status: normalizeString(req.body.status, 'draft'),
      ...buildRelationData(req.body.relatedAppSlugs, req.body.relatedPostSlugs)
    },
    include: includeTopicRelations()
  });
  return sendSuccess(res, serializeTopic(topic), 'created', 201);
}

export async function update(req, res) {
  const current = await prisma.topic.findUnique({ where: { slug: req.params.slug } });
  if (!current) return sendError(res, ErrorCodes.TOPIC_NOT_FOUND, 'topic not found');
  const nextSlug = req.body.slug ? normalizeString(req.body.slug).trim() : current.slug;
  if (nextSlug !== current.slug) {
    const existed = await prisma.topic.findUnique({ where: { slug: nextSlug } });
    if (existed) return sendError(res, ErrorCodes.SLUG_EXISTS, 'slug already exists');
  }
  const hasApps = Object.prototype.hasOwnProperty.call(req.body, 'relatedAppSlugs');
  const hasPosts = Object.prototype.hasOwnProperty.call(req.body, 'relatedPostSlugs');
  const topic = await prisma.$transaction(async (tx) => {
    if (hasApps) await tx.topicApp.deleteMany({ where: { topicId: current.id } });
    if (hasPosts) await tx.topicPost.deleteMany({ where: { topicId: current.id } });
    return tx.topic.update({
      where: { slug: current.slug },
      data: {
        ...patchTopicData(current, req.body),
        ...(hasApps ? buildRelationData(req.body.relatedAppSlugs, undefined) : {}),
        ...(hasPosts ? buildRelationData(undefined, req.body.relatedPostSlugs) : {})
      },
      include: includeTopicRelations()
    });
  });
  return sendSuccess(res, serializeTopic(topic), 'updated');
}

export async function remove(req, res) {
  const topic = await prisma.topic.findUnique({ where: { slug: req.params.slug } });
  if (!topic) return sendError(res, ErrorCodes.TOPIC_NOT_FOUND, 'topic not found');
  await prisma.topic.delete({ where: { slug: req.params.slug } });
  return sendSuccess(res, null, 'deleted');
}
