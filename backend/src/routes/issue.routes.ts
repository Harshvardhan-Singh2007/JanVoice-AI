import { Router } from 'express';
import { body } from 'express-validator';
import { create, getMine } from '../controllers/issue.controller.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { issuePriorities } from '../models/Issue.js';

export const issueRouter = Router();

issueRouter.use(authenticate, authorize('citizen'));

issueRouter.post('/', [
  body('title').trim().isLength({ min: 5, max: 160 }).withMessage('Title must be between 5 and 160 characters.'),
  body('description').trim().isLength({ min: 15, max: 5000 }).withMessage('Description must be between 15 and 5000 characters.'),
  body('category').trim().isLength({ min: 2, max: 80 }).withMessage('Category is required.'),
  body('priority').isIn(issuePriorities).withMessage('A valid priority is required.'),
  body('location').trim().isLength({ min: 2, max: 250 }).withMessage('Location is required.'),
  body('anonymous').optional().isBoolean().toBoolean(),
  body('emergency').optional().isBoolean().toBoolean(),
  body('image').optional().isString().isLength({ max: 500 }).withMessage('Image placeholder is invalid.'),
  validateRequest,
], create);

issueRouter.get('/mine', getMine);
