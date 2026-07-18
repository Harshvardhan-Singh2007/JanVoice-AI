import type { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

export const validateRequest: RequestHandler = (request, _response, next) => {
  const result = validationResult(request);
  if (!result.isEmpty()) {
    return next(new ApiError(422, 'Request validation failed.'));
  }
  return next();
};
