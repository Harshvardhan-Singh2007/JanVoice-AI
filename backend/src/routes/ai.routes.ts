import { Router } from 'express';
import { body } from 'express-validator';
import { analyze } from '../controllers/ai.controller.js';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';

export const aiRouter = Router();
const analysisRateLimit = createRateLimiter({
  ...env.rateLimits.aiAnalysis,
  message: 'Too many AI analysis requests. Please try again later.',
});

aiRouter.use(authenticate);

aiRouter.post('/analyze', [
  analysisRateLimit,
  body('text')
    .isString().withMessage('Complaint text is required.')
    .bail()
    .trim()
    .isLength({ min: 10, max: 5000 }).withMessage('Complaint text must be between 10 and 5000 characters.'),
  validateRequest,
], authorize('citizen'), analyze);
