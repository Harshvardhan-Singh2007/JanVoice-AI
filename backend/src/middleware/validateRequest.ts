import type { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

export const validateRequest: RequestHandler = (request, _response, next) => {
  const result = validationResult(request);
  if (!result.isEmpty()) {
    const details = result.array().flatMap((error) => {
      if (error.type === 'field') return [{ field: error.path, message: String(error.msg) }];
      if (error.type === 'unknown_fields') {
        return error.fields.map((field) => ({ field: field.path, message: String(error.msg) }));
      }
      const nestedFields = error.type === 'alternative_grouped'
        ? error.nestedErrors.flat()
        : error.nestedErrors;
      const field = nestedFields.map((nestedError) => nestedError.path).join(', ') || 'request';
      return [{ field, message: String(error.msg) }];
    });
    return next(new ApiError(422, 'Request validation failed.', true, details));
  }
  return next();
};
