export const ErrorCodes = {
  SUCCESS: 0,
  PARAM_ERROR: 40000,
  UNAUTHORIZED: 40100,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  METHOD_NOT_ALLOWED: 40500,
  INTERNAL_ERROR: 50000,
  USER_EXISTS: 10001,
  USER_NOT_FOUND: 10002,
  PASSWORD_ERROR: 10003,
  TOKEN_INVALID: 10004,
  TOKEN_EXPIRED: 10005,
  PERMISSION_DENIED: 10006,
  SLUG_EXISTS: 20001,
  APP_NOT_FOUND: 20002,
  POST_NOT_FOUND: 20003,
  TOPIC_NOT_FOUND: 20004,
  COMMENT_NOT_FOUND: 20005,
  REQUEST_NOT_FOUND: 20006,
  APP_CATEGORY_EXISTS: 20007,
  APP_CATEGORY_NOT_FOUND: 20008,
  APP_CATEGORY_IN_USE: 20009
};

export function success(data = null, message = 'ok') {
  return {
    success: true,
    code: ErrorCodes.SUCCESS,
    message,
    data,
    timestamp: Date.now()
  };
}

export function error(code, message = 'error', data = null) {
  return {
    success: false,
    code,
    message,
    data,
    timestamp: Date.now()
  };
}

export function httpStatusFromCode(code) {
  switch (code) {
    case ErrorCodes.PARAM_ERROR:
      return 400;
    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.TOKEN_INVALID:
    case ErrorCodes.TOKEN_EXPIRED:
    case ErrorCodes.USER_NOT_FOUND:
    case ErrorCodes.PASSWORD_ERROR:
      return 401;
    case ErrorCodes.FORBIDDEN:
    case ErrorCodes.PERMISSION_DENIED:
      return 403;
    case ErrorCodes.NOT_FOUND:
    case ErrorCodes.APP_NOT_FOUND:
    case ErrorCodes.POST_NOT_FOUND:
    case ErrorCodes.TOPIC_NOT_FOUND:
    case ErrorCodes.COMMENT_NOT_FOUND:
    case ErrorCodes.REQUEST_NOT_FOUND:
      return 404;
    case ErrorCodes.METHOD_NOT_ALLOWED:
      return 405;
    case ErrorCodes.USER_EXISTS:
    case ErrorCodes.SLUG_EXISTS:
    case ErrorCodes.APP_CATEGORY_EXISTS:
      return 409;
    case ErrorCodes.APP_CATEGORY_IN_USE:
      return 409;
    default:
      return 500;
  }
}

export function sendSuccess(res, data = null, message = 'ok', status = 200) {
  return res.status(status).json(success(data, message));
}

export function sendError(res, code, message, data = null) {
  return res.status(httpStatusFromCode(code)).json(error(code, message, data));
}
