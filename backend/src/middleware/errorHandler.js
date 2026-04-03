import { ErrorCodes, error, httpStatusFromCode } from '../utils/response.js';

function mapPrismaError(err) {
  if (!err || typeof err !== 'object' || !('code' in err)) {
    return null;
  }

  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(',') : String(err.meta?.target ?? '');
    if (target.includes('username') || target.includes('email')) {
      return {
        code: ErrorCodes.USER_EXISTS,
        message: 'user already exists'
      };
    }

    return {
      code: ErrorCodes.SLUG_EXISTS,
      message: 'duplicate unique field'
    };
  }

  if (err.code === 'P2025') {
    return {
      code: ErrorCodes.NOT_FOUND,
      message: 'record not found'
    };
  }

  return null;
}

export default function errorHandler(err, req, res, next) {
  console.error('[Unhandled Error]', err);
  const mapped = mapPrismaError(err);
  if (mapped) {
    return res.status(httpStatusFromCode(mapped.code)).json(error(mapped.code, mapped.message));
  }

  const status = err?.status || err?.statusCode || 500;
  const code = status >= 400 && status < 500 ? ErrorCodes.PARAM_ERROR : ErrorCodes.INTERNAL_ERROR;
  const message = err?.message ? `server error: ${err.message}` : 'internal server error';
  return res.status(status).json(error(code, message));
}
