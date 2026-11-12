import { UserModel, type UserDocument } from '../models/User.js';
import type { AuthenticatedUser, LoginInput, RegisterInput } from '../types/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { comparePassword, hashPassword } from '../utils/password.js';

const toAuthenticatedUser = (user: UserDocument): AuthenticatedUser => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  ...(user.phone ? { phone: user.phone } : {}),
  role: user.role,
  ...(user.department ? { department: user.department } : {}),
});

export async function registerUser(input: RegisterInput): Promise<AuthenticatedUser> {
  const existingUser = await UserModel.exists({ email: input.email.toLowerCase() });
  if (existingUser) throw new ApiError(409, 'An account with this email already exists.');
  const user = await UserModel.create({
    ...input,
    email: input.email.toLowerCase(),
    password: await hashPassword(input.password),
    role: 'citizen',
  });
  return toAuthenticatedUser(user);
}

export async function loginUser(input: LoginInput): Promise<AuthenticatedUser> {
  const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select('+password');
  if (!user || !(await comparePassword(input.password, user.password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  return toAuthenticatedUser(user);
}

export async function requestPasswordReset(email: string): Promise<void> {
  // Intentionally return success without revealing whether an email exists. Email delivery is added later.
  await UserModel.exists({ email: email.toLowerCase() });
}
