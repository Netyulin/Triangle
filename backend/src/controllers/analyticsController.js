import { body } from 'express-validator';
import prisma from '../utils/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeString } from '../utils/serializers.js';

export const pageViewValidation = validate([
  body('path').trim().notEmpty().withMessage('path is required'),
  body('referrer').optional().isString().withMessage('referrer must be a string')
]);

export async function recordPageView(req, res) {
  const path = normalizeString(req.body.path).trim();
  if (!path) {
    return sendSuccess(res, { recorded: false }, 'ignored');
  }

  await prisma.pageView.create({
    data: {
      path,
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || null,
      referrer: req.body.referrer ? normalizeString(req.body.referrer).trim() : req.get('Referer') || null
    }
  });

  return sendSuccess(res, { recorded: true });
}
