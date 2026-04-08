import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeInteger, normalizeJsonInput, normalizeString, serializeNotification } from '../utils/serializers.js';
import {
  createNotification,
  createNotificationForAllUsers,
  createNotificationsForUsers,
  getNotificationTemplate,
  getUnreadNotificationCount,
  listNotificationTemplates,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  softDeleteNotification,
  upsertNotificationTemplate
} from '../utils/notifications.js';

export const listValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be a boolean')
]);

export const idValidation = validate([
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer')
]);

export const templateValidation = validate([
  param('key').trim().notEmpty().withMessage('key is required'),
  body('title').optional().isString().withMessage('title must be a string'),
  body('content').optional().isString().withMessage('content must be a string'),
  body('description').optional().isString().withMessage('description must be a string'),
  body('enabled').optional().isBoolean().withMessage('enabled must be a boolean')
]);

export const sendValidation = validate([
  body('userIds').optional().isArray().withMessage('userIds must be an array'),
  body('sendToAll').optional().isBoolean().withMessage('sendToAll must be a boolean'),
  body('templateKey').optional().isString().withMessage('templateKey must be a string'),
  body('title').optional().isString().withMessage('title must be a string'),
  body('content').optional().isString().withMessage('content must be a string'),
  body('data').optional(),
  body('link').optional().isString().withMessage('link must be a string')
]);

function serializeRows(items) {
  return items.map(serializeNotification);
}

export async function list(req, res) {
  const page = normalizeInteger(req.query.page, 1);
  const pageSize = normalizeInteger(req.query.pageSize, 20);
  const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === true;
  const result = await listNotificationsForUser(req.user.id, {
    page,
    pageSize,
    unreadOnly
  });
  const unreadCount = await getUnreadNotificationCount(req.user.id);

  return sendSuccess(res, {
    ...result,
    unreadCount,
    list: serializeRows(result.list)
  });
}

export async function unreadCount(req, res) {
  const count = await getUnreadNotificationCount(req.user.id);
  return sendSuccess(res, { unreadCount: count });
}

export async function markRead(req, res) {
  const id = normalizeInteger(req.params.id, 0);
  const result = await markNotificationRead(id, req.user.id);

  if (!result || result.count === 0) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'notification not found');
  }

  return sendSuccess(res, null, 'updated');
}

export async function markAllRead(req, res) {
  await markAllNotificationsRead(req.user.id);
  return sendSuccess(res, null, 'updated');
}

export async function remove(req, res) {
  const id = normalizeInteger(req.params.id, 0);
  const result = await softDeleteNotification(id, req.user.id);

  if (!result || result.count === 0) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'notification not found');
  }

  return sendSuccess(res, null, 'deleted');
}

export async function templates(_req, res) {
  const items = await listNotificationTemplates();
  return sendSuccess(res, items);
}

export async function updateTemplate(req, res) {
  const key = normalizeString(req.params.key).trim();
  const item = await upsertNotificationTemplate(key, {
    title: req.body.title,
    content: req.body.content,
    description: req.body.description,
    enabled: req.body.enabled
  });

  if (!item) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'template key is invalid');
  }

  return sendSuccess(res, item, 'updated');
}

export async function send(req, res) {
  const userIds = Array.isArray(req.body.userIds) ? req.body.userIds.map((item) => normalizeInteger(item, 0)).filter(Boolean) : [];
  const sendToAll = req.body.sendToAll === true || req.body.sendToAll === 'true';
  const templateKey = normalizeString(req.body.templateKey).trim();
  const template = templateKey ? await getNotificationTemplate(templateKey) : null;
  const data = normalizeJsonInput(req.body.data, null);
  const title = normalizeString(req.body.title || template?.title || '站内通知').trim() || '站内通知';
  const content = normalizeString(req.body.content || template?.content || '').trim();
  const payload = {
    senderId: req.user.id,
    type: templateKey ? 'template' : 'system',
    templateKey: templateKey || null,
    title,
    content,
    data,
    link: req.body.link ? normalizeString(req.body.link).trim() : null
  };

  if (!content && !template) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'content is required');
  }

  if (sendToAll) {
    const result = await createNotificationForAllUsers(payload);
    return sendSuccess(res, { count: result.count }, 'created', 201);
  }

  if (userIds.length === 0) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'userIds or sendToAll is required');
  }

  const result = await createNotificationsForUsers(userIds, payload);
  return sendSuccess(res, { count: result.count }, 'created', 201);
}

export async function createForUser(req, res) {
  const userId = normalizeInteger(req.params.id, 0);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!user) {
    return sendError(res, ErrorCodes.USER_NOT_FOUND, 'user not found');
  }

  const templateKey = normalizeString(req.body.templateKey).trim();
  const template = templateKey ? await getNotificationTemplate(templateKey) : null;
  const notification = await createNotification({
    userId,
    senderId: req.user.id,
    type: templateKey ? 'template' : 'system',
    templateKey: templateKey || null,
    title: normalizeString(req.body.title || template?.title || '站内通知').trim() || '站内通知',
    content: normalizeString(req.body.content || template?.content || '').trim(),
    data: normalizeJsonInput(req.body.data, null),
    link: req.body.link ? normalizeString(req.body.link).trim() : null
  });

  return sendSuccess(res, serializeNotification(notification), 'created', 201);
}
