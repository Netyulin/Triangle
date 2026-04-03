import { validationResult } from 'express-validator';
import { ErrorCodes, error } from '../utils/response.js';

export function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }

    const firstError = result.array({ onlyFirstError: true })[0];
    return res.status(400).json(
      error(ErrorCodes.PARAM_ERROR, firstError.msg, {
        field: firstError.path ?? firstError.param ?? null,
        location: firstError.location ?? null
      })
    );
  };
}
