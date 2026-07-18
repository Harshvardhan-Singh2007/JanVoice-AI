export type UserRole = 'citizen' | 'authority' | 'admin';

export interface AuthUser {
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
