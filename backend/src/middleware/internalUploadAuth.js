import crypto from 'node:crypto';
import { ErrorCodes, sendError } from '../utils/response.js';

function toBuffer(value) {
  return Buffer.from(String(value ?? ''), 'utf8');
}

function safeEqualString(a, b) {
  const left = toBuffer(a);
  const right = toBuffer(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function resolveIncomingPassword(req) {
  const headerPassword =
    req.get('x-upload-password')
    || req.get('x-local-upload-password')
    || req.get('x-internal-upload-password');
  if (headerPassword) return String(headerPassword).trim();

  const bodyPassword = req.body?.password;
  if (bodyPassword) return String(bodyPassword).trim();

  const queryPassword = req.query?.password;
  if (queryPassword) return String(queryPassword).trim();

  return '';
}

export function requireInternalUploadPassword(req, res, next) {
  const expected = String(process.env.INTERNAL_UPLOAD_PASSWORD || '').trim();
  if (!expected) {
    return sendError(res, ErrorCodes.NOT_FOUND, 'resource not found');
  }

  const incoming = resolveIncomingPassword(req);
  if (!incoming || !safeEqualString(incoming, expected)) {
    return sendError(res, ErrorCodes.FORBIDDEN, 'forbidden');
  }

  return next();
}

