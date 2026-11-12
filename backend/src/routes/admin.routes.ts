import { Router } from 'express';
import { body, param } from 'express-validator';
import { authorityAccounts, notifications, recentActivity, statistics } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { setAuthorityDepartment } from '../controllers/admin.controller.js';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('admin'));
adminRouter.get('/statistics', statistics);
adminRouter.get('/recent-activity', recentActivity);
adminRouter.get('/notifications', notifications);
adminRouter.get('/authorities', authorityAccounts);
adminRouter.patch('/authorities/:userId/department', [
  param('userId').isMongoId().withMessage('A valid authority identifier is required.'),
  body('department').trim().isLength({ min: 2, max: 120 }).withMessage('Department must be between 2 and 120 characters.'),
  body().custom((value) => Object.keys(value as Record<string, unknown>).length === 1 && Object.hasOwn(value, 'department')).withMessage('Only the department can be changed.'),
  validateRequest,
], setAuthorityDepartment);
