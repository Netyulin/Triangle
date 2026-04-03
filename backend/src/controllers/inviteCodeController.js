import { body, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { ErrorCodes, sendSuccess } from '../utils/response.js';
import { createInviteCodeBatch, listInviteCodes } from '../utils/inviteCodes.js';
import { normalizeInteger, normalizeString } from '../utils/serializers.js';

export const listValidation = validate([
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit is invalid')
]);

export const createBatchValidation = validate([
  body('count').isInt({ min: 1, max: 100 }).withMessage('count must be between 1 and 100'),
  body('note').optional().isString().withMessage('note must be a string')
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

  return sendSuccess(res, result, 'created', 201);
}
