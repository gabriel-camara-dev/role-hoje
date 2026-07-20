import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { User } from '@/domain/main/enterprise/entities/user';
import type { Prisma } from '@/@types/prisma/client';
import type { UserModel } from '@/@types/prisma/models/User';

export class PrismaUserMapper {
  static toDomain(raw: UserModel): User {
    return User.create(
      {
        name: raw.name,
        username: raw.username,
        email: raw.email,
        passwordHash: raw.passwordHash,
        googleId: raw.googleId,
        avatarEncryptedPath: raw.avatarEncryptedPath,
        avatarIv: raw.avatarIv,
        avatarAuthTag: raw.avatarAuthTag,
        avatarMimeType: raw.avatarMimeType,
        avatarOriginalName: raw.avatarOriginalName,
        avatarUpdatedAt: raw.avatarUpdatedAt,
        loginAttempts: raw.loginAttempts,
        lastLogin: raw.lastLogin,
        role: raw.role,
        token: raw.token,
        tokenExpiresAt: raw.tokenExpiresAt,
        emailVerifiedAt: raw.emailVerifiedAt,
        emailVerificationTokenHash: raw.emailVerificationTokenHash,
        emailVerificationTokenExpiresAt: raw.emailVerificationTokenExpiresAt,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        passwordChangedAt: raw.passwordChangedAt,
      },
      new UniqueEntityID(raw.publicId),
    );
  }

  static toPrismaCreate(user: User): Prisma.UserCreateInput {
    return {
      publicId: user.publicId,
      name: user.name,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      googleId: user.googleId,
      loginAttempts: user.loginAttempts,
      lastLogin: user.lastLogin,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      emailVerificationTokenHash: user.emailVerificationTokenHash,
      emailVerificationTokenExpiresAt: user.emailVerificationTokenExpiresAt,
      createdAt: user.createdAt,
    };
  }

  static toPrismaUpdate(user: User): Prisma.UserUpdateInput {
    return {
      name: user.name,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      googleId: user.googleId,
      avatarEncryptedPath: user.avatarEncryptedPath,
      avatarIv: user.avatarIv,
      avatarAuthTag: user.avatarAuthTag,
      avatarMimeType: user.avatarMimeType,
      avatarOriginalName: user.avatarOriginalName,
      avatarUpdatedAt: user.avatarUpdatedAt,
      passwordChangedAt: user.passwordChangedAt,
      token: user.token,
      tokenExpiresAt: user.tokenExpiresAt,
      emailVerifiedAt: user.emailVerifiedAt,
      emailVerificationTokenHash: user.emailVerificationTokenHash,
      emailVerificationTokenExpiresAt: user.emailVerificationTokenExpiresAt,
      loginAttempts: user.loginAttempts,
      lastLogin: user.lastLogin,
    };
  }
}
