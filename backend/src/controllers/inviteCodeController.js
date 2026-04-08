import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { ErrorCodes, sendSuccess } from '../utils/response.js';
import { createInviteCodeBatch, listInviteCodes } from '../utils/inviteCodes.js';
import { normalizeInteger, normalizeString } from '../utils/serializers.js';
import { createNotificationsForUsers } from '../utils/notifications.js';

export const listValidation = validate([
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit is invalid')
]);

export const createBatchValidation = validate([
  body('count').isInt({ min: 1, max: 100 }).withMessage('count must be between 1 and 100'),
  body('note').optional().isString().withMessage('note must be a string'),
  body('recipientUserIds').optional().isArray().withMessage('recipientUserIds must be an array'),
  body('recipientUserIds.*').optional().isInt({ min: 1 }).withMessage('recipient user id is invalid')
]);

export async function list(req, res) {
  const limit = normalizeInteger(req.query.limit, 100);
  const rows = await listInviteCodes(limit);
  return sendSuccess(res, rows);
}

export async function createBatch(req, res) {
  const result = await createInviteCodeBatch({
    count: normalizeInteger(req.body.count, 10),
    note: normalizeString(req.body.note).trim()
  });

  const recipientUserIds = Array.isArray(req.body.recipientUserIds)
    ? req.body.recipientUserIds.map((item) => normalizeInteger(item, 0)).filter(Boolean)
    : [];

  if (recipientUserIds.length > 0) {
    await createNotificationsForUsers(recipientUserIds, {
      senderId: req.user?.id ?? null,
      type: 'invite',
      templateKey: 'invite_code_assigned',
      title: '邀请码已发放',
      content: `你收到了一批邀请码：${result.codes.join('，')}`,
      data: {
        batchId: result.batchId,
        codes: result.codes
      }
    });
  }

  return sendSuccess(res, result, 'created', 201);
}
