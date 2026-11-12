import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';
import multer from 'multer';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new ApiError(404, `Route not found: ${request.method} ${request.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next) => {
  void next;
  const isApiError = error instanceof ApiError;
  const mongoDuplicate = typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
  const invalidToken = error instanceof Error && ['JsonWebTokenError', 'TokenExpiredError'].includes(error.name);
  const fileTooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
  const multerBadRequest = error instanceof multer.MulterError;
  const malformedJson = error instanceof SyntaxError && typeof error === 'object' && error !== null && 'status' in error && error.status === 400;
  const statusCode = isApiError ? error.statusCode : mongoDuplicate ? 409 : invalidToken ? 401 : fileTooLarge ? 413 : multerBadRequest || malformedJson ? 400 : 500;
  const message = isApiError ? error.message : mongoDuplicate ? 'A record with this value already exists.' : invalidToken ? 'Invalid or expired authentication token.' : fileTooLarge ? 'Image upload must not exceed 5 MB.' : multerBadRequest ? 'The uploaded file could not be accepted.' : malformedJson ? 'Request body must contain valid JSON.' : 'An unexpected server error occurred.';
  if (!isApiError) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('Request failed.', { requestId: request.requestId, errorName, statusCode });
  }
  response.status(statusCode).json({
    status: 'error',
    message,
    requestId: request.requestId,
    ...(isApiError && error.details ? { errors: error.details } : {}),
  });
};
