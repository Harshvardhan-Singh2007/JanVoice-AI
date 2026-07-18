import type { RequestHandler } from 'express';
import { UserModel, type UserRole } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate: RequestHandler = asyncHandler(async (request, _response, next) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) throw new ApiError(401, 'Authentication token is required.');
  const payload = verifyAccessToken(authorization.slice(7));
  const user = await UserModel.findById(payload.sub).select('_id role');
  if (!user) throw new ApiError(401, 'The authenticated user no longer exists.');
  request.auth = { userId: user.id, role: user.role };
  next();
});

export const authorize = (...roles: UserRole[]): RequestHandler => (request, _response, next) => {
  if (!request.auth || !roles.includes(request.auth.role)) return next(new ApiError(403, 'You do not have permission to access this resource.'));
  return next();
};
