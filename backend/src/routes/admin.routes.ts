import { Router } from 'express';
import { notifications, recentActivity, statistics } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/authenticate.js';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('admin'));
adminRouter.get('/statistics', statistics);
adminRouter.get('/recent-activity', recentActivity);
adminRouter.get('/notifications', notifications);
