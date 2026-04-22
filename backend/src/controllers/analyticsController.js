import { body } from 'express-validator';
import prisma from '../utils/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import { normalizeString } from '../utils/serializers.js';

export const pageViewValidation = validate([
  body('path').optional({ nullable: true }).isString().withMessage('path must be a string'),
  body('referrer').optional({ nullable: true }).isString().withMessage('referrer must be a string')
]);

export async function recordPageView(req, res) {
  const payloadPath = normalizeString(req.body?.path, '').trim();
  const headerReferrer = normalizeString(req.get('Referer') || '').trim();
  const bodyReferrer = normalizeString(req.body?.referrer, '').trim();

  let path = payloadPath;
  if (!path && headerReferrer) {
    try {
      const refUrl = new URL(headerReferrer);
      path = `${refUrl.pathname}${refUrl.search || ''}`;
    } catch {
      // ignore invalid referrer
    }
  }

  if (!path) {
    return sendSuccess(res, { recorded: false }, 'ignored');
  }

  await prisma.pageView.create({
    data: {
      path,
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || null,
      referrer: bodyReferrer || headerReferrer || null
    }
  });

  return sendSuccess(res, { recorded: true });
}
