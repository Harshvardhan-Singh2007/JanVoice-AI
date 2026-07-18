import type { RequestHandler } from 'express';
import { getAdminNotifications, getDashboardStatistics, getRecentActivity } from '../services/admin.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
