import type { Prisma } from '@/@types/prisma/client';
import type { UserModel } from '@/@types/prisma/models/User';
import type { CreateUserData, UpdateUserData, User } from '@/domain/main/enterprise/entities/user';

export class PrismaUserMapper {
  static toDomain(raw: UserModel): User {
    return {
      id: raw.id,
      publicId: raw.publicId,
      name: raw.name,
      username: raw.username,
      email: raw.email,
      cpf: raw.cpf,
      passwordHash: raw.passwordHash,
      loginAttempts: raw.loginAttempts,
      lastLogin: raw.lastLogin,
      role: raw.role,
      token: raw.token,
      tokenExpiresAt: raw.tokenExpiresAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      passwordChangedAt: raw.passwordChangedAt,
    };
  }

  static toPrisma(user: CreateUserData): Prisma.UserCreateInput {
    return {
      name: user.name,
      username: user.username,
      email: user.email,
      cpf: user.cpf,
      passwordHash: user.passwordHash,
      ...(user.role ? { role: user.role } : {}),
    };
  }

  static toUpdatePrisma(data: UpdateUserData): Prisma.UserUpdateInput {
    return {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.username !== undefined && { username: data.username }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.cpf !== undefined && { cpf: data.cpf }),
      ...(data.passwordHash !== undefined && { passwordHash: data.passwordHash }),
      ...(data.passwordChangedAt !== undefined && { passwordChangedAt: data.passwordChangedAt }),
      ...(data.token !== undefined && { token: data.token }),
      ...(data.tokenExpiresAt !== undefined && { tokenExpiresAt: data.tokenExpiresAt }),
      ...(data.loginAttempts !== undefined && { loginAttempts: data.loginAttempts }),
      ...(data.lastLogin !== undefined && { lastLogin: data.lastLogin }),
    };
  }
}
