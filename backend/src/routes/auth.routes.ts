import { Router } from 'express';
import { body } from 'express-validator';
import { forgotPassword, login, register } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { env } from '../config/env.js';

export const authRouter = Router();

const loginRateLimit = createRateLimiter({
  ...env.rateLimits.login,
  message: 'Too many login attempts. Please try again later.',
});
const registrationRateLimit = createRateLimiter({
  ...env.rateLimits.registration,
  message: 'Too many registration attempts. Please try again later.',
});

authRouter.post('/register', [
  registrationRateLimit,
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters.'),
  body('email').trim().isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('phone').optional({ values: 'falsy' }).trim().matches(/^[0-9+\-()\s]{7,20}$/).withMessage('A valid phone number is required.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.'),
  validateRequest,
], register);

authRouter.post('/login', [
  loginRateLimit,
  body('email').trim().isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('password').isString().notEmpty().withMessage('Password is required.'),
  validateRequest,
], login);

authRouter.post('/forgot-password', [
  body('email').trim().isEmail().normalizeEmail().withMessage('A valid email is required.'),
  validateRequest,
], forgotPassword);
