import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ErrorCodes } from '../utils/response.js';

function buildKey(req) {
  const userId = req.user?.id ? `user:${req.user.id}` : '';
  if (userId) {
    return userId;
  }

  const candidate =
    req.ip ||
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for'] ||
    'unknown';

  const ip = String(candidate).split(',')[0].trim();
  return `ip:${ipKeyGenerator(ip)}`;
}

function buildLimiter(windowMs, max, message, extraOptions = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: buildKey,
    ...extraOptions,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        code: ErrorCodes.FORBIDDEN,
        message,
        data: null,
        timestamp: Date.now(),
      });
    },
  });
}

export const loginRateLimit = buildLimiter(10 * 60 * 1000, 10, '登录尝试过于频繁，请稍后再试。', {
  skipSuccessfulRequests: true,
});

export const registerRateLimit = buildLimiter(30 * 60 * 1000, 8, '注册请求过于频繁，请稍后再试。');
export const forgotPasswordRateLimit = buildLimiter(10 * 60 * 1000, 6, '找回密码请求过于频繁，请稍后再试。');
export const resetPasswordRateLimit = buildLimiter(10 * 60 * 1000, 10, '重置密码请求过于频繁，请稍后再试。');

export const generalApiRateLimit = buildLimiter(60 * 1000, 120, '请求过于频繁，请稍后再试。');

export const uploadRateLimit = buildLimiter(10 * 60 * 1000, 20, '上传操作过于频繁，请稍后再试。');

export const downloadTrackingRateLimit = buildLimiter(5 * 60 * 1000, 60, '点击记录过于频繁，请稍后再试。');

export const signStatusRateLimit = buildLimiter(60 * 1000, 90, '签名状态刷新过于频繁，请稍后再试。');

export const signMutationRateLimit = buildLimiter(10 * 60 * 1000, 12, '签名相关操作过于频繁，请稍后再试。');
