import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new ApiError(404, `Route not found: ${request.method} ${request.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next) => {
  void next;
  const isApiError = error instanceof ApiError;
  const mongoDuplicate = typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
  const invalidToken = error instanceof Error && ['JsonWebTokenError', 'TokenExpiredError'].includes(error.name);
  const statusCode = isApiError ? error.statusCode : mongoDuplicate ? 409 : invalidToken ? 401 : 500;
  const message = isApiError ? error.message : mongoDuplicate ? 'A record with this value already exists.' : invalidToken ? 'Invalid or expired authentication token.' : 'An unexpected server error occurred.';
  if (!isApiError) console.error(error);
  response.status(statusCode).json({
    status: 'error',
    message,
    requestId: request.requestId,
    ...(env.nodeEnv !== 'production' && !isApiError && error instanceof Error ? { stack: error.stack } : {}),
  });
};
