import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/@types/prisma/client';
import type {
  FindUserConflict,
  ListUsersQuery,
  ListUsersResult,
  UsersRepository,
} from '@/domain/main/application/repositories/users-repository';
import type { User } from '@/domain/main/enterprise/entities/user';
import { DatabaseContext } from '../database-context';
import { PrismaUserMapper } from '../mappers/prisma-user-mapper';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {}

  async findByPublicId(publicId: string): Promise<User | null> {
    const user = await this.dbContext.client.user.findUnique({ where: { publicId } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.dbContext.client.user.findUnique({ where: { email } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.dbContext.client.user.findUnique({ where: { username } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await this.dbContext.client.user.findUnique({ where: { googleId } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findByEmailVerificationTokenHash(tokenHash: string): Promise<User | null> {
    const user = await this.dbContext.client.user.findFirst({
      where: { emailVerificationTokenHash: tokenHash },
    });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findByLogin(login: string): Promise<User | null> {
    const user = await this.dbContext.client.user.findFirst({
      where: { OR: [{ email: login }, { username: login }] },
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
        orderBy: { createdAt: 'desc' },
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

  async create(user: User): Promise<void> {
    await this.dbContext.client.user.create({ data: PrismaUserMapper.toPrismaCreate(user) });
  }

  async save(user: User): Promise<void> {
    await this.dbContext.client.user.update({
      where: { publicId: user.publicId },
      data: PrismaUserMapper.toPrismaUpdate(user),
    });
  }

  async delete(user: User): Promise<void> {
    await this.dbContext.client.user.delete({ where: { publicId: user.publicId } });
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
}
