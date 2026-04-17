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

function mapUploadError(err) {
  if (!err) return null;

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return {
        status: 400,
        code: ErrorCodes.PARAM_ERROR,
        message: '上传文件过大，请使用 8MB 以内的图片'
      };
    }

    return {
      status: 400,
      code: ErrorCodes.PARAM_ERROR,
      message: err.message || '上传文件不符合要求'
    };
  }

  if (err.code === 'UNSUPPORTED_IMAGE_TYPE') {
    return {
      status: 400,
      code: ErrorCodes.PARAM_ERROR,
      message: err.message || '图片格式不受支持'
    };
  }

  return null;
}

export default function errorHandler(err, req, res, next) {
  const uploadError = mapUploadError(err);
  if (uploadError) {
    console.warn('[Upload Error]', uploadError.message);
    return res.status(uploadError.status).json(error(uploadError.code, uploadError.message));
  }

  const mapped = mapPrismaError(err);
  if (mapped) {
    return res.status(httpStatusFromCode(mapped.code)).json(error(mapped.code, mapped.message));
  }

  console.error('[Unhandled Error]', err);
  const status = err?.status || err?.statusCode || 500;
  const code = status >= 400 && status < 500 ? ErrorCodes.PARAM_ERROR : ErrorCodes.INTERNAL_ERROR;
  const message = err?.message ? `server error: ${err.message}` : 'internal server error';
  return res.status(status).json(error(code, message));
}
