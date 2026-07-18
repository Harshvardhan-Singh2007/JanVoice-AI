import { Router } from 'express';
import { body } from 'express-validator';
import { analyze } from '../controllers/ai.controller.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';

export const aiRouter = Router();

aiRouter.use(authenticate);

aiRouter.post('/analyze', [
  body('text')
    .isString().withMessage('Complaint text is required.')
    .bail()
    .trim()
    .isLength({ min: 10 }).withMessage('Complaint text must be at least 10 characters.'),
  validateRequest,
], authorize('citizen'), analyze);
