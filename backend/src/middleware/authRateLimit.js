import rateLimit from 'express-rate-limit';
import { ErrorCodes } from '../utils/response.js';

function buildLimiter(windowMs, max, message, extraOptions = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...extraOptions,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        code: ErrorCodes.FORBIDDEN,
        message,
        data: null,
        timestamp: Date.now()
      });
    }
  });
}

export const loginRateLimit = buildLimiter(10 * 60 * 1000, 10, 'too many login attempts, please try again later', {
  skipSuccessfulRequests: true
});
export const registerRateLimit = buildLimiter(30 * 60 * 1000, 10, 'too many registration attempts, please try again later');
