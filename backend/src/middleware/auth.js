import jwt from 'jsonwebtoken';
import { ErrorCodes, error } from '../utils/response.js';

const JWT_SECRET = process.env.JWT_SECRET || 'triangle-portal-cms-secret-key-2024';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json(error(ErrorCodes.UNAUTHORIZED, 'login required'));
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json(error(ErrorCodes.TOKEN_EXPIRED, 'token expired'));
    }
    return res.status(401).json(error(ErrorCodes.TOKEN_INVALID, 'invalid token'));
  }
}

export function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return next();
  }

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json(error(ErrorCodes.TOKEN_INVALID, 'invalid token'));
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json(error(ErrorCodes.TOKEN_EXPIRED, 'token expired'));
    }
    return res.status(401).json(error(ErrorCodes.TOKEN_INVALID, 'invalid token'));
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json(error(ErrorCodes.PERMISSION_DENIED, 'admin permission required'));
  }
  return next();
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
