import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.js';
import { ErrorCodes, sendError, sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeInteger, normalizeJsonInput, normalizeString, serializeNotification } from '../utils/serializers.js';
import { normalizeMembershipLevel } from '../utils/membership.js';
import {
  createNotification,
  createNotificationsForUsers,
  getNotificationTemplate,
  getUnreadNotificationCount,
  listNotificationTemplates,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_USAGE_CONDITIONS,
  softDeleteNotification,
  upsertNotificationTemplate
} from '../utils/notifications.js';

const USER_STATUSES = ['active', 'disabled', 'banned'];

export const listValidation = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be a boolean')
]);

export const idValidation = validate([param('id').isInt({ min: 1 }).withMessage('id must be a positive integer')]);

export const templateValidation = validate([
  param('key').trim().notEmpty().withMessage('key is required'),
  body('title').optional().isString().withMessage('title must be a string'),
  body('content').optional().isString().withMessage('content must be a string'),
  body('description').optional().isString().withMessage('description must be a string'),
  body('usageCondition').optional().isIn(NOTIFICATION_USAGE_CONDITIONS).withMessage('usageCondition is invalid'),
  body('enabled').optional().isBoolean().withMessage('enabled must be a boolean')
]);

export const sendValidation = validate([
  body('userIds').optional().isArray().withMessage('userIds must be an array'),
  body('sendToAll').optional().isBoolean().withMessage('sendToAll must be a boolean'),
  body('templateKey').optional().isString().withMessage('templateKey must be a string'),
  body('title').optional().isString().withMessage('title must be a string'),
  body('content').optional().isString().withMessage('content must be a string'),
  body('data').optional(),
  body('link').optional().isString().withMessage('link must be a string'),
  body('userStatuses').optional().isArray().withMessage('userStatuses must be an array'),
  body('membershipLevels').optional().isArray().withMessage('membershipLevels must be an array')
]);

function serializeRows(items) {
  return items.map(serializeNotification);
}

function parseStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeString(item).trim()).filter(Boolean);
}

function parseUserStatuses(rawStatuses) {
  return [...new Set(parseStringArray(rawStatuses).map((item) => item.toLowerCase()).filter((item) => USER_STATUSES.includes(item)))];
}

function parseMembershipLevels(rawLevels) {
  return [...new Set(parseStringArray(rawLevels).map((item) => normalizeMembershipLevel(item)).filter(Boolean))];
}

async function resolveRecipientIds({ userIds, sendToAll, userStatuses, membershipLevels }) {
  const normalizedUserIds = [...new Set((Array.isArray(userIds) ? userIds : []).map((item) => normalizeInteger(item, 0)).filter(Boolean))];
  const hasFilters = userStatuses.length > 0 || membershipLevels.length > 0;

  if (!sendToAll && !hasFilters) {
    return normalizedUserIds;
  }

  const where = {};
  if (userStatuses.length > 0) {
    where.status = { in: userStatuses };
  }
  if (membershipLevels.length > 0) {
    where.membershipLevel = { in: membershipLevels };
  }
  if (!sendToAll && normalizedUserIds.length > 0) {
    where.id = { in: normalizedUserIds };
  }

  const recipients = await prisma.user.findMany({
    where,
    select: { id: true }
  });
  return recipients.map((item) => item.id);
}

function buildDefaultTitle(templateTitle) {
  const fallback = normalizeString(templateTitle || '站内通知').trim();
  return fallback || '站内通知';
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
    usageCondition: req.body.usageCondition,
    enabled: req.body.enabled
  });

  if (!item) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'template key is invalid');
  }

  return sendSuccess(res, item, 'updated');
}

export async function send(req, res) {
  const sendToAll = req.body.sendToAll === true || req.body.sendToAll === 'true';
  const userStatuses = parseUserStatuses(req.body.userStatuses);
  const membershipLevels = parseMembershipLevels(req.body.membershipLevels);
  const templateKey = normalizeString(req.body.templateKey).trim();
  const template = templateKey ? await getNotificationTemplate(templateKey) : null;

  if (templateKey && !template) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'template not found');
  }
  if (template && template.enabled === false) {
    return sendError(res, ErrorCodes.FORBIDDEN, 'template is disabled');
  }

  const title = buildDefaultTitle(req.body.title || template?.title);
  const content = normalizeString(req.body.content || template?.content || '').trim();
  if (!content) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'content is required');
  }

  const recipientIds = await resolveRecipientIds({
    userIds: req.body.userIds,
    sendToAll,
    userStatuses,
    membershipLevels
  });

  if (recipientIds.length === 0) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'no users matched the conditions');
  }

  const payload = {
    senderId: req.user.id,
    type: templateKey ? 'template' : 'system',
    templateKey: templateKey || null,
    title,
    content,
    data: normalizeJsonInput(req.body.data, null),
    link: req.body.link ? normalizeString(req.body.link).trim() : null
  };

  const result = await createNotificationsForUsers(recipientIds, payload);
  return sendSuccess(
    res,
    {
      count: result.count,
      filters: {
        sendToAll,
        userStatuses,
        membershipLevels
      }
    },
    'created',
    201
  );
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
  if (templateKey && !template) {
    return sendError(res, ErrorCodes.PARAM_ERROR, 'template not found');
  }

  const notification = await createNotification({
    userId,
    senderId: req.user.id,
    type: templateKey ? 'template' : 'system',
    templateKey: templateKey || null,
    title: buildDefaultTitle(req.body.title || template?.title),
    content: normalizeString(req.body.content || template?.content || '').trim(),
    data: normalizeJsonInput(req.body.data, null),
    link: req.body.link ? normalizeString(req.body.link).trim() : null
  });

  return sendSuccess(res, serializeNotification(notification), 'created', 201);
}
