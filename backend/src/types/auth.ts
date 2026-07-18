import type { UserRole } from '../models/User.js';

export interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
}
