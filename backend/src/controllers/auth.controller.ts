import type { RequestHandler } from 'express';
import { loginUser, registerUser, requestPasswordReset } from '../services/auth.service.js';
import type { LoginInput, RegisterInput } from '../types/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signAccessToken } from '../utils/jwt.js';

const authResponse = (user: { id: string; fullName: string; email: string; phone?: string; role: 'citizen' | 'authority' | 'admin' }) => ({
  token: signAccessToken({ sub: user.id, role: user.role, email: user.email, fullName: user.fullName }),
  user,
});

export const register: RequestHandler = asyncHandler(async (request, response) => {
  const user = await registerUser(request.body as RegisterInput);
  response.status(201).json({ status: 'success', data: authResponse(user) });
});

export const login: RequestHandler = asyncHandler(async (request, response) => {
  const user = await loginUser(request.body as LoginInput);
  response.status(200).json({ status: 'success', data: authResponse(user) });
});

export const forgotPassword: RequestHandler = asyncHandler(async (request, response) => {
  await requestPasswordReset((request.body as { email: string }).email);
  response.status(202).json({ status: 'success', message: 'If an account exists, password reset instructions will be sent.' });
});
