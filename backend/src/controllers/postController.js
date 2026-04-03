import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeBoolean, normalizeInteger, normalizeString, serializePost } from '../utils/serializers.js';
import { importContentFromSource } from '../utils/contentImport.js';
import { localizeHtmlImages, localizeRemoteImage } from '../utils/imageLocalization.js';

const postStatuses = ['published', 'archived', 'scheduled'];

const listValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('category').optional().isString().withMessage('category must be a string'),
  query('status').optional().isIn(postStatuses).withMessage('status is invalid'),
  query('featured').optional().isBoolean().withMessage('featured must be a boolean'),
  query('search').optional().isString().withMessage('search must be a string')
]);

const writeValidationRules = [
  body('slug').optional().trim().notEmpty().withMessage('slug is required'),
  body('title').optional().trim().notEmpty().withMessage('title is required'),
  body('excerpt').optional().trim().notEmpty().withMessage('excerpt is required'),
  body('category').optional().trim().notEmpty().withMessage('category is required'),
  body('author').optional().trim().notEmpty().withMessage('author is required'),
  body('coverImage').optional().trim().notEmpty().withMessage('coverImage is required'),
  body('readingTime').optional().trim().notEmpty().withMessage('readingTime is required'),
  body('dateLabel').optional().trim().notEmpty().withMessage('dateLabel is required'),
  body('publishedAt').optional().trim().notEmpty().withMessage('publishedAt is required'),
  body('featured').optional().isBoolean().withMessage('featured must be a boolean'),
  body('status').optional().isIn(postStatuses).withMessage('status is invalid')
];

const createValidation = validate([
  body('slug').trim().notEmpty().withMessage('slug is required'),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('excerpt').trim().notEmpty().withMessage('excerpt is required'),
  body('category').trim().notEmpty().withMessage('category is required'),
  body('author').trim().notEmpty().withMessage('author is required'),
  body('coverImage').trim().notEmpty().withMessage('coverImage is required'),
  body('readingTime').trim().notEmpty().withMessage('readingTime is required'),
  body('dateLabel').trim().notEmpty().withMessage('dateLabel is required'),
  body('publishedAt').trim().notEmpty().withMessage('publishedAt is required'),
  ...writeValidationRules
]);

const updateValidation = validate(writeValidationRules);
const slugParamValidation = validate([param('slug').trim().notEmpty().withMessage('slug is required')]);
const importContentValidation = validate([
  body('url').optional().isString().withMessage('url must be a string'),
  body('rawContent').optional().isString().withMessage('rawContent must be a string'),
  body().custom((value) => {
    const hasUrl = typeof value?.url === 'string' && value.url.trim();
    const hasContent = typeof value?.rawContent === 'string' && value.rawContent.trim();

    if (!hasUrl && !hasContent) {
      throw new Error('url or rawContent is required');
    }

    return true;
  })
]);

export { listValidation, createValidation, updateValidation, slugParamValidation, importContentValidation };

function includePostRelations() {
  return {
    relatedApp: { select: { slug: true, name: true, icon: true, subtitle: true } },
    adminAuthor: { select: { id: true, username: true, name: true, avatar: true, role: true } },
    topics: { include: { topic: true } }
  };
}

function buildWhere(queryArgs, isAuthenticated) {
  const where = {};
  if (queryArgs.category) where.category = normalizeString(queryArgs.category).trim();
  if (isAuthenticated && queryArgs.status) where.status = normalizeString(queryArgs.status).trim();
  else if (!isAuthenticated) where.status = 'published';
  if (queryArgs.featured !== undefined) where.featured = normalizeBoolean(queryArgs.featured);
  if (queryArgs.search) {
    const keyword = normalizeString(queryArgs.search).trim();
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { excerpt: { contains: keyword } },
        { content: { contains: keyword } },
        { category: { contains: keyword } },
        { author: { contains: keyword } }
      ];
    }
  }
  return where;
}

function buildPostData(body) {
  return {
    slug: normalizeString(body.slug).trim(),
    title: normalizeString(body.title).trim(),
    excerpt: normalizeString(body.excerpt).trim(),
    content: body.content !== undefined ? normalizeString(body.content, '') : '',
    category: normalizeString(body.category).trim(),
    author: normalizeString(body.author, '\u585e\u5c14\u8fbe').trim() || '\u585e\u5c14\u8fbe',
    coverImage: normalizeString(body.coverImage).trim(),
    relatedAppSlug: body.relatedAppSlug ? normalizeString(body.relatedAppSlug).trim() : null,
    featured: normalizeBoolean(body.featured),
    readingTime: normalizeString(body.readingTime).trim(),
    dateLabel: normalizeString(body.dateLabel).trim(),
    publishedAt: normalizeString(body.publishedAt).trim(),
    status: body.status !== undefined ? normalizeString(body.status).trim() : 'published',
    seoTitle: body.seoTitle !== undefined ? normalizeString(body.seoTitle, '') : '',
    seoDescription: body.seoDescription !== undefined ? normalizeString(body.seoDescription, '') : ''
  };
}

async function localizePostAssets(payload) {
  const nextPayload = {
    ...payload
  };

  if (nextPayload.coverImage) {
    try {
      nextPayload.coverImage = await localizeRemoteImage(nextPayload.coverImage, 'post-cover');
    } catch (error) {
      console.warn('[localize post cover skipped]', nextPayload.coverImage, error instanceof Error ? error.message : error);
    }
  }

  if (nextPayload.content) {
    nextPayload.content = await localizeHtmlImages(nextPayload.content, 'post-cover');
  }

  return nextPayload;
}

async function ensureRelatedAppExists(relatedAppSlug) {
  if (!relatedAppSlug) {
    return null;
  }

  const app = await prisma.app.findUnique({
    where: { slug: relatedAppSlug },
    select: { slug: true }
  });

  return app;
}

function patchPostData(current, body) {
  const nextSlug = body.slug ? normalizeString(body.slug).trim() : current.slug;
  return {
    slug: nextSlug,
    title: body.title !== undefined ? normalizeString(body.title).trim() : current.title,
    excerpt: body.excerpt !== undefined ? normalizeString(body.excerpt).trim() : current.excerpt,
    content: body.content !== undefined ? normalizeString(body.content, '') : current.content,
    category: body.category !== undefined ? normalizeString(body.category).trim() : current.category,
    author:
      body.author !== undefined
        ? normalizeString(body.author, '\u585e\u5c14\u8fbe').trim() || current.author || '\u585e\u5c14\u8fbe'
        : current.author,
    coverImage: body.coverImage !== undefined ? normalizeString(body.coverImage).trim() : current.coverImage,
    relatedAppSlug: body.relatedAppSlug !== undefined ? (body.relatedAppSlug ? normalizeString(body.relatedAppSlug).trim() : null) : current.relatedAppSlug,
    featured: body.featured !== undefined ? normalizeBoolean(body.featured) : current.featured,
    readingTime: body.readingTime !== undefined ? normalizeString(body.readingTime).trim() : current.readingTime,
    dateLabel: body.dateLabel !== undefined ? normalizeString(body.dateLabel).trim() : current.dateLabel,
    publishedAt: body.publishedAt !== undefined ? normalizeString(body.publishedAt).trim() : current.publishedAt,
    status: body.status !== undefined ? normalizeString(body.status).trim() : current.status,
    seoTitle: body.seoTitle !== undefined ? normalizeString(body.seoTitle, '') : current.seoTitle,
    seoDescription: body.seoDescription !== undefined ? normalizeString(body.seoDescription, '') : current.seoDescription
  };
}

export async function list(req, res) {
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 10);
  const where = buildWhere(req.query, Boolean(req.user));
  const [items, total] = await Promise.all([
    prisma.post.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }], include: includePostRelations() }),
    prisma.post.count({ where })
  ]);
  return sendSuccess(res, { list: items.map(serializePost), total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function featured(req, res) {
  const limit = normalizeInteger(req.query.limit, 5);
  const items = await prisma.post.findMany({ where: { featured: true, status: 'published' }, take: limit, orderBy: [{ createdAt: 'desc' }], include: includePostRelations() });
  return sendSuccess(res, items.map(serializePost));
}

export async function categories(req, res) {
  const rows = await prisma.post.findMany({ where: { status: 'published' }, select: { category: true } });
  const grouped = rows.reduce((acc, row) => {
    acc[row.category] = (acc[row.category] || 0) + 1;
    return acc;
  }, {});
  return sendSuccess(res, Object.entries(grouped).map(([name, count]) => ({ name, count })));
}

export async function detail(req, res) {
  const post = await prisma.post.findUnique({ where: { slug: req.params.slug }, include: includePostRelations() });
  if (!post) return sendError(res, ErrorCodes.POST_NOT_FOUND, 'post not found');
  if (!req.user && post.status !== 'published') {
    return sendError(res, ErrorCodes.POST_NOT_FOUND, 'post not found');
  }
  return sendSuccess(res, serializePost(post));
}

export async function create(req, res) {
  const payload = await localizePostAssets(buildPostData(req.body));
  if (payload.relatedAppSlug) {
    const relatedApp = await ensureRelatedAppExists(payload.relatedAppSlug);
    if (!relatedApp) {
      return sendError(res, ErrorCodes.APP_NOT_FOUND, 'related app not found');
    }
  }
  const existed = await prisma.post.findUnique({ where: { slug: payload.slug } });
  if (existed) return sendError(res, ErrorCodes.SLUG_EXISTS, 'slug already exists');
  const post = await prisma.post.create({ data: { ...payload, authorId: req.user.id }, include: includePostRelations() });
  return sendSuccess(res, serializePost(post), 'created', 201);
}

export async function update(req, res) {
  const current = await prisma.post.findUnique({ where: { slug: req.params.slug } });
  if (!current) return sendError(res, ErrorCodes.POST_NOT_FOUND, 'post not found');
  if (req.body.relatedAppSlug) {
    const relatedApp = await ensureRelatedAppExists(normalizeString(req.body.relatedAppSlug).trim());
    if (!relatedApp) {
      return sendError(res, ErrorCodes.APP_NOT_FOUND, 'related app not found');
    }
  }
  const nextSlug = req.body.slug ? normalizeString(req.body.slug).trim() : current.slug;
  if (nextSlug !== current.slug) {
    const existed = await prisma.post.findUnique({ where: { slug: nextSlug } });
    if (existed) return sendError(res, ErrorCodes.SLUG_EXISTS, 'slug already exists');
  }
  const nextPayload = await localizePostAssets(patchPostData(current, req.body));
  const post = await prisma.post.update({ where: { slug: current.slug }, data: nextPayload, include: includePostRelations() });
  return sendSuccess(res, serializePost(post), 'updated');
}

export async function remove(req, res) {
  const current = await prisma.post.findUnique({ where: { slug: req.params.slug } });
  if (!current) return sendError(res, ErrorCodes.POST_NOT_FOUND, 'post not found');
  await prisma.post.delete({ where: { slug: req.params.slug } });
  return sendSuccess(res, null, 'deleted');
}

export async function importFromUrl(req, res) {
  try {
    const result = await importContentFromSource({
      url: req.body.url,
      rawContent: req.body.rawContent
    });

    const localized = { ...result };

    if (localized.coverImage) {
      try {
        localized.coverImage = await localizeRemoteImage(localized.coverImage, 'post-cover');
      } catch (error) {
        console.warn('[import cover localize skipped]', localized.coverImage, error instanceof Error ? error.message : error);
      }
    }

    if (localized.contentHtml) {
      localized.contentHtml = await localizeHtmlImages(localized.contentHtml, 'post-cover');
    }

    return sendSuccess(res, localized, 'imported');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, ErrorCodes.PARAM_ERROR, error.message);
    }

    console.error('[post import failed]', error);
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'failed to import content');
  }
}
