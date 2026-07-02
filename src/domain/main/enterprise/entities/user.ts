import type { UserRole } from './user-role';

export { USER_ROLES, type UserRole } from './user-role';

export interface User {
  id: number;
  publicId: string;
  name: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  avatarEncryptedPath: string | null;
  avatarIv: string | null;
  avatarAuthTag: string | null;
  avatarMimeType: string | null;
  avatarOriginalName: string | null;
  avatarUpdatedAt: Date | null;
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
  email: string;
  passwordHash?: string | null;
  googleId?: string | null;
  lastLogin?: Date | null;
  role?: UserRole;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  passwordHash?: string | null;
  googleId?: string | null;
  avatarEncryptedPath?: string | null;
  avatarIv?: string | null;
  avatarAuthTag?: string | null;
  avatarMimeType?: string | null;
  avatarOriginalName?: string | null;
  avatarUpdatedAt?: Date | null;
  passwordChangedAt?: Date;
  token?: string | null;
  tokenExpiresAt?: Date | null;
  loginAttempts?: number;
  lastLogin?: Date | null;
}
