import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { ErrorCodes, error } from '../utils/response.js';
import { serializeUser } from '../utils/serializers.js';

const JWT_SECRET = process.env.JWT_SECRET || 'triangle-portal-cms-secret-key-2024';

async function resolveAuthenticatedUser(payload) {
  if (!payload?.id) {
    return null;
  }

  const current = await prisma.user.findUnique({
    where: { id: payload.id }
  });

  if (!current) {
    return null;
  }

  if (current.status === 'banned' && current.bannedUntil && new Date(current.bannedUntil) <= new Date()) {
    return prisma.user.update({
      where: { id: current.id },
      data: {
        status: 'active',
        bannedUntil: null,
        banReason: null
      }
    });
  }

  return current;
}

export function authenticate(req, res, next) {
  // 支持 Authorization: Bearer <token> 和 X-Token: <token>
  const authHeader = req.headers.authorization;
  const xToken = req.headers['x-token'];

  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (xToken) {
    token = xToken;
  }

  if (!token) {
    return res.status(401).json(error(ErrorCodes.UNAUTHORIZED, 'login required'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return resolveAuthenticatedUser(payload)
      .then((user) => {
        if (!user) {
          return res.status(401).json(error(ErrorCodes.USER_NOT_FOUND, 'user not found'));
        }

        if (user.status !== 'active') {
          return res.status(403).json(error(ErrorCodes.FORBIDDEN, user.status === 'banned' ? 'account is banned' : 'account is disabled'));
        }

        req.user = {
          ...payload,
          ...serializeUser(user)
        };

        return next();
      })
      .catch((err) => {
        console.error('[authenticate failed]', err);
        return res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'internal server error'));
      });
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json(error(ErrorCodes.TOKEN_EXPIRED, 'token expired'));
    }
    return res.status(401).json(error(ErrorCodes.TOKEN_INVALID, 'invalid token'));
  }
}

export function optionalAuthenticate(req, res, next) {
  // 支持 Authorization: Bearer <token> 和 X-Token: <token>
  const authHeader = req.headers.authorization;
  const xToken = req.headers['x-token'];

  if (!authHeader && !xToken) {
    return next();
  }

  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (xToken) {
    token = xToken;
  } else {
    return res.status(401).json(error(ErrorCodes.TOKEN_INVALID, 'invalid token'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return resolveAuthenticatedUser(payload)
      .then((user) => {
        if (!user) {
          return res.status(401).json(error(ErrorCodes.USER_NOT_FOUND, 'user not found'));
        }

        if (user.status !== 'active') {
          return res.status(403).json(error(ErrorCodes.FORBIDDEN, user.status === 'banned' ? 'account is banned' : 'account is disabled'));
        }

        req.user = {
          ...payload,
          ...serializeUser(user)
        };

        return next();
      })
      .catch((err) => {
        console.error('[optional authenticate failed]', err);
        return res.status(500).json(error(ErrorCodes.INTERNAL_ERROR, 'internal server error'));
      });
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
