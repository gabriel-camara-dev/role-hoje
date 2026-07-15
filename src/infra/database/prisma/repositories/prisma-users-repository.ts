import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/@types/prisma/client';
import type {
  FindUserBy,
  FindUserConflict,
  ListUsersQuery,
  ListUsersResult,
  UsersRepository,
} from '@/domain/main/application/repositories/users-repository';
import type { CreateUserData, UpdateUserData, User } from '@/domain/main/enterprise/entities/user';
import { DatabaseContext } from '../database-context';
import { PrismaUserMapper } from '../mappers/prisma-user-mapper';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {}

  async create(data: CreateUserData): Promise<User> {
    const user = await this.dbContext.client.user.create({
      data: PrismaUserMapper.toPrisma(data),
    });

    return PrismaUserMapper.toDomain(user);
  }

  async findBy(findUserBy: FindUserBy): Promise<User | null> {
    const user = await this.dbContext.client.user.findUnique({
      where: this.mapFindUserByToWhere(findUserBy),
    });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findByLogin(login: string): Promise<User | null> {
    const user = await this.dbContext.client.user.findFirst({
      where: {
        OR: [{ email: login }, { username: login }],
      },
    });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findConflict({ email, username, ignoredPublicId }: FindUserConflict): Promise<User | null> {
    const conflicts = [email ? { email } : undefined, username ? { username } : undefined].filter(
      (field) => field !== undefined,
    );

    if (conflicts.length === 0) {
      return null;
    }

    const user = await this.dbContext.client.user.findFirst({
      where: {
        OR: conflicts,
        ...(ignoredPublicId ? { NOT: { publicId: ignoredPublicId } } : {}),
      },
    });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async list(query: ListUsersQuery): Promise<ListUsersResult> {
    const currentPage = query.page ?? 1;
    const perPage = query.limit ?? 10;
    const where: Prisma.UserWhereInput = {};

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query.email) {
      where.email = { contains: query.email, mode: 'insensitive' };
    }

    if (query.username) {
      where.username = { contains: query.username.replace(/^@/, ''), mode: 'insensitive' };
    }

    const [users, totalCount] = await Promise.all([
      this.dbContext.client.user.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (currentPage - 1) * perPage,
        take: perPage,
      }),
      this.dbContext.client.user.count({ where }),
    ]);

    return {
      data: users.map((user) => PrismaUserMapper.toDomain(user)),
      totalPages: Math.ceil(totalCount / perPage),
      totalCount,
      currentPage,
    };
  }

  async updateById(id: number, data: UpdateUserData): Promise<User> {
    const user = await this.dbContext.client.user.update({
      where: { id },
      data: PrismaUserMapper.toUpdatePrisma(data),
    });

    return PrismaUserMapper.toDomain(user);
  }

  async deleteById(id: number): Promise<User> {
    const user = await this.dbContext.client.user.delete({
      where: { id },
    });

    return PrismaUserMapper.toDomain(user);
  }

  async deleteExpiredUnverified(now: Date): Promise<number> {
    const { count } = await this.dbContext.client.user.deleteMany({
      where: {
        emailVerifiedAt: null,
        emailVerificationTokenExpiresAt: { lt: now },
      },
    });

    return count;
  }

  private mapFindUserByToWhere(findUserBy: FindUserBy): Prisma.UserWhereUniqueInput {
    if (findUserBy.id) {
      return { id: findUserBy.id };
    }

    if (findUserBy.publicId) {
      return { publicId: findUserBy.publicId };
    }

    if (findUserBy.username) {
      return { username: findUserBy.username };
    }

    if (findUserBy.email) {
      return { email: findUserBy.email };
    }

    if (findUserBy.googleId) {
      return { googleId: findUserBy.googleId };
    }

    if (findUserBy.token) {
      return { token: findUserBy.token };
    }

    if (findUserBy.emailVerificationTokenHash) {
      return { emailVerificationTokenHash: findUserBy.emailVerificationTokenHash };
    }

    throw new Error('At least one field must be provided for FindUserBy');
  }
}
