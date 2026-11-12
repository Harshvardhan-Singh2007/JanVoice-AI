import type { RequestHandler } from 'express';
import { getAdminNotifications, getDashboardStatistics, getRecentActivity } from '../services/admin.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UserModel } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const statistics: RequestHandler = asyncHandler(async (_request, response) => {
  const statisticsData = await getDashboardStatistics();
  response.status(200).json({ status: 'success', data: { statistics: statisticsData } });
});

export const recentActivity: RequestHandler = asyncHandler(async (_request, response) => {
  const activity = await getRecentActivity();
  response.status(200).json({ status: 'success', data: { activity } });
});

export const notifications: RequestHandler = asyncHandler(async (_request, response) => {
  const notificationsData = await getAdminNotifications();
  response.status(200).json({ status: 'success', data: { notifications: notificationsData } });
});

export const setAuthorityDepartment: RequestHandler = asyncHandler(async (request, response) => {
  const { userId } = request.params;
  if (typeof userId !== 'string') throw new ApiError(400, 'Invalid authority identifier.');
  const user = await UserModel.findOneAndUpdate(
    { _id: userId, role: 'authority' },
    { $set: { department: (request.body as { department: string }).department.trim() } },
    { new: true, runValidators: true, projection: 'fullName email role department' },
  );
  if (!user) throw new ApiError(404, 'Authority account not found.');
  response.status(200).json({ status: 'success', data: { authority: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, department: user.department } } });
});

export const authorityAccounts: RequestHandler = asyncHandler(async (_request, response) => {
  const authorities = await UserModel.find({ role: 'authority' }).select('fullName email role department').sort({ fullName: 1 }).limit(200);
  response.status(200).json({ status: 'success', data: { authorities } });
});
