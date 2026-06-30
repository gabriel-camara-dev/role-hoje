import type { UserRole } from './user-role';

export { USER_ROLES, type UserRole } from './user-role';

export interface User {
  id: number;
  publicId: string;
  name: string;
  username: string;
  email: string;
  cpf: string;
  passwordHash: string;
  loginAttempts: number;
  lastLogin: Date | null;
  role: UserRole;
  token: string | null;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  passwordChangedAt: Date | null;
}

export interface CreateUserData {
  name: string;
  username: string;
  email: string;
  cpf: string;
  passwordHash: string;
  role?: UserRole;
}

export interface UpdateUserData {
  name?: string;
  username?: string;
  email?: string;
  cpf?: string;
  passwordHash?: string;
  passwordChangedAt?: Date;
  token?: string | null;
  tokenExpiresAt?: Date | null;
  loginAttempts?: number;
  lastLogin?: Date | null;
}
