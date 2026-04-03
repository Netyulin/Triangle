import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeInteger, normalizeString, serializeRequest } from '../utils/serializers.js';
import { ensureUserFeatureTables, getRequestVoteSummary } from '../utils/userFeatures.js';

const allowedStatuses = ['pending', 'processing', 'done', 'rejected'];

const publicListValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 50 }).withMessage('pageSize must be between 1 and 50'),
  query('status').optional().isIn(allowedStatuses).withMessage('status is invalid')
]);

const adminListValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('status').optional().isIn(allowedStatuses).withMessage('status is invalid')
]);

const createValidation = validate([
  body('title').trim().notEmpty().withMessage('title is required'),
  body('description').trim().notEmpty().withMessage('description is required'),
  body('authorName').optional().trim().notEmpty().withMessage('authorName is required'),
  body('authorEmail').optional().trim().isEmail().withMessage('authorEmail must be a valid email')
]);

const requestIdValidation = validate([param('id').isInt({ min: 1 }).withMessage('id must be a positive integer')]);

const updateValidation = validate([
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer'),
  body('status').optional().isIn(allowedStatuses).withMessage('status is invalid'),
  body('adminReply').optional().isString().withMessage('adminReply must be a string')
]);

export { publicListValidation, adminListValidation, createValidation, requestIdValidation, updateValidation };

async function attachVoteSummary(items, userId) {
  const voteSummary = await getRequestVoteSummary(
    items.map((item) => item.id),
    userId
  );

  return items.map((item) => {
    const summary = voteSummary.get(item.id) || { voteCount: 0, userVoted: false };
    return serializeRequest({
      ...item,
      voteCount: summary.voteCount,
      userVoted: summary.userVoted
    });
  });
}

function buildWhere(status) {
  const where = {};
  if (status) where.status = normalizeString(status).trim();
  return where;
}

export async function publicList(req, res) {
  await ensureUserFeatureTables();
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 10);
  const where = buildWhere(req.query.status);
  const [items, total] = await Promise.all([
    prisma.softwareRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        authorName: true,
        status: true,
        createdAt: true,
        adminReply: true,
        repliedAt: true
      }
    }),
    prisma.softwareRequest.count({ where })
  ]);
  return sendSuccess(res, {
    list: await attachVoteSummary(items, req.user?.id),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

export async function adminList(req, res) {
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 20);
  const where = buildWhere(req.query.status);
  const [items, total, pending, processing, done, rejected] = await Promise.all([
    prisma.softwareRequest.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: 'desc' }] }),
    prisma.softwareRequest.count({ where }),
    prisma.softwareRequest.count({ where: { status: 'pending' } }),
    prisma.softwareRequest.count({ where: { status: 'processing' } }),
    prisma.softwareRequest.count({ where: { status: 'done' } }),
    prisma.softwareRequest.count({ where: { status: 'rejected' } })
  ]);
  return sendSuccess(res, {
    list: items.map(serializeRequest),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    stats: { pending, processing, done, rejected, total }
  });
}

export async function myList(req, res) {
  await ensureUserFeatureTables();
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 20);
  const where = {
    ...buildWhere(req.query.status),
    userId: req.user.id
  };

  const [items, total] = await Promise.all([
    prisma.softwareRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }]
    }),
    prisma.softwareRequest.count({ where })
  ]);

  return sendSuccess(res, {
    list: await attachVoteSummary(items, req.user.id),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

export async function create(req, res) {
  const user = req.user
    ? await prisma.user.findUnique({
        where: { id: req.user.id }
      })
    : null;
  const authorName = user ? normalizeString(user.name || user.username).trim() : normalizeString(req.body.authorName).trim();
  const authorEmail = user ? normalizeString(user.email).trim() : normalizeString(req.body.authorEmail).trim();

  if (!authorName || !authorEmail) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'authorName and authorEmail are required');
  }

  if (user && !user.canSubmitRequest) {
    return sendError(res, ErrorCodes.FORBIDDEN, 'request permission denied');
  }

  const request = await prisma.softwareRequest.create({
    data: {
      title: normalizeString(req.body.title).trim(),
      description: normalizeString(req.body.description).trim(),
      authorName,
      authorEmail,
      status: 'pending',
      userId: user?.id ?? null
    }
  });
  return sendSuccess(res, request, 'created', 201);
}

export async function update(req, res) {
  const id = normalizeInteger(req.params.id, 0);
  const current = await prisma.softwareRequest.findUnique({ where: { id } });
  if (!current) return sendError(res, ErrorCodes.REQUEST_NOT_FOUND, 'request not found');
  const request = await prisma.softwareRequest.update({
    where: { id },
    data: {
      status: req.body.status !== undefined ? normalizeString(req.body.status).trim() : undefined,
      adminReply: req.body.adminReply !== undefined ? normalizeString(req.body.adminReply, '') : undefined,
      repliedAt: req.body.adminReply !== undefined ? new Date() : undefined
    }
  });
  return sendSuccess(res, serializeRequest(request), 'updated');
}

export async function remove(req, res) {
  const id = normalizeInteger(req.params.id, 0);
  const current = await prisma.softwareRequest.findUnique({ where: { id } });
  if (!current) return sendError(res, ErrorCodes.REQUEST_NOT_FOUND, 'request not found');
  await prisma.softwareRequest.delete({ where: { id } });
  return sendSuccess(res, null, 'deleted');
}

export async function removeOwn(req, res) {
  const id = normalizeInteger(req.params.id, 0);
  const current = await prisma.softwareRequest.findUnique({ where: { id } });
  if (!current) return sendError(res, ErrorCodes.REQUEST_NOT_FOUND, 'request not found');

  if (current.userId !== req.user.id && req.user.role !== 'admin') {
    return sendError(res, ErrorCodes.PERMISSION_DENIED, 'request permission denied');
  }

  await prisma.softwareRequest.delete({ where: { id } });
  return sendSuccess(res, null, 'deleted');
}

export async function vote(req, res) {
  await ensureUserFeatureTables();

  const id = normalizeInteger(req.params.id, 0);
  const current = await prisma.softwareRequest.findUnique({ where: { id } });
  if (!current) {
    return sendError(res, ErrorCodes.REQUEST_NOT_FOUND, 'request not found');
  }

  if (current.userId && current.userId === req.user.id) {
    return sendError(res, ErrorCodes.PERMISSION_DENIED, 'cannot vote your own request');
  }

  const existed = await prisma.$queryRawUnsafe(
    'SELECT requestId FROM request_votes WHERE userId = ? AND requestId = ? LIMIT 1',
    req.user.id,
    id
  );

  let userVoted = false;
  if (existed.length > 0) {
    await prisma.$executeRawUnsafe('DELETE FROM request_votes WHERE userId = ? AND requestId = ?', req.user.id, id);
  } else {
    await prisma.$executeRawUnsafe(
      'INSERT INTO request_votes (userId, requestId, createdAt) VALUES (?, ?, CURRENT_TIMESTAMP)',
      req.user.id,
      id
    );
    userVoted = true;
  }

  const [summary] = await attachVoteSummary([current], userVoted ? req.user.id : req.user.id);
  return sendSuccess(
    res,
    {
      requestId: id,
      voteCount: summary.voteCount ?? 0,
      userVoted: summary.userVoted ?? false
    },
    userVoted ? 'voted' : 'vote removed'
  );
}
