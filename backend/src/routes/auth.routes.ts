import { Router } from 'express';
import { body } from 'express-validator';
import { forgotPassword, login, register } from '../controllers/auth.controller.js';
import { userRoles } from '../models/User.js';
import { validateRequest } from '../middleware/validateRequest.js';

export const authRouter = Router();

authRouter.post('/register', [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters.'),
  body('email').trim().isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('phone').optional({ values: 'falsy' }).trim().matches(/^[0-9+\-()\s]{7,20}$/).withMessage('A valid phone number is required.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.'),
  body('role').isIn(userRoles).withMessage('A valid role is required.'),
  validateRequest,
], register);

authRouter.post('/login', [
  body('email').trim().isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('password').isString().notEmpty().withMessage('Password is required.'),
  validateRequest,
], login);

authRouter.post('/forgot-password', [
  body('email').trim().isEmail().normalizeEmail().withMessage('A valid email is required.'),
  validateRequest,
], forgotPassword);
