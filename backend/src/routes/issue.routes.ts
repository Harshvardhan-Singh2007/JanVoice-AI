import { Router } from 'express';
import { body, param } from 'express-validator';
import { create, getAll, getMine, getOne, remove, update, updateStatus } from '../controllers/issue.controller.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { issuePriorities } from '../models/Issue.js';
import { imageUpload } from '../middleware/upload.js';

export const issueRouter = Router();

issueRouter.use(authenticate);

issueRouter.post('/', imageUpload.single('image'), [
  body('title').trim().isLength({ min: 5, max: 160 }).withMessage('Title must be between 5 and 160 characters.'),
  body('description').trim().isLength({ min: 15, max: 5000 }).withMessage('Description must be between 15 and 5000 characters.'),
  body('category').trim().isLength({ min: 2, max: 80 }).withMessage('Category is required.'),
  body('priority').isIn(issuePriorities).withMessage('A valid priority is required.'),
  body('location').trim().isLength({ min: 2, max: 250 }).withMessage('Location is required.'),
  body('anonymous').optional().isBoolean().toBoolean(),
  body('emergency').optional().isBoolean().toBoolean(),
  validateRequest,
], authorize('citizen'), create);

issueRouter.get('/mine', authorize('citizen'), getMine);

issueRouter.get('/', authorize('authority', 'admin'), getAll);

issueRouter.patch('/:issueId/status', [
  param('issueId').isMongoId().withMessage('A valid issue identifier is required.'),
  body('status').isIn(['Pending', 'In Progress', 'Resolved']).withMessage('Status must be Pending, In Progress, or Resolved.'),
  validateRequest,
], authorize('authority', 'admin'), updateStatus);

issueRouter.get('/:issueId', [param('issueId').isMongoId().withMessage('A valid issue identifier is required.'), validateRequest], authorize('authority', 'admin'), getOne);

issueRouter.patch('/:issueId', [
  param('issueId').isMongoId().withMessage('A valid issue identifier is required.'),
  body('status').optional().isIn(['Pending', 'In Progress', 'Resolved']).withMessage('Status must be Pending, In Progress, or Resolved.'),
  body('assignedDepartment').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Department must be between 2 and 120 characters.'),
  body('remarks').optional().trim().isLength({ max: 2000 }).withMessage('Remarks cannot exceed 2000 characters.'),
  body().custom((value) => Object.keys(value as Record<string, unknown>).some((key) => ['status', 'assignedDepartment', 'remarks'].includes(key))).withMessage('Provide at least one issue update.'),
  validateRequest,
], authorize('authority', 'admin'), update);

issueRouter.delete('/:issueId', [param('issueId').isMongoId().withMessage('A valid issue identifier is required.'), validateRequest], authorize('admin'), remove);
