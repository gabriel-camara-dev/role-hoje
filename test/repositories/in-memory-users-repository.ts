import type {
  FindUserConflict,
  ListUsersQuery,
  ListUsersResult,
  UsersRepository,
} from '@/domain/main/application/repositories/users-repository';
import type { User } from '@/domain/main/enterprise/entities/user';

export class InMemoryUsersRepository implements UsersRepository {
  public items: User[] = [];

  async findByPublicId(publicId: string): Promise<User | null> {
    return this.items.find((user) => user.publicId === publicId) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.items.find((user) => user.email === email) ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.items.find((user) => user.username === username) ?? null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.items.find((user) => user.googleId === googleId) ?? null;
  }

  async findByEmailVerificationTokenHash(tokenHash: string): Promise<User | null> {
    return this.items.find((user) => user.emailVerificationTokenHash === tokenHash) ?? null;
  }

  async findByLogin(login: string): Promise<User | null> {
    return this.items.find((user) => user.username === login || user.email === login) ?? null;
  }

  async findConflict(data: FindUserConflict): Promise<User | null> {
    return (
      this.items.find(
        (user) =>
          user.publicId !== data.ignoredPublicId &&
          ((data.username !== undefined && user.username === data.username) ||
            (data.email !== undefined && user.email === data.email)),
      ) ?? null
    );
  }

  async list(query: ListUsersQuery): Promise<ListUsersResult> {
    const filtered = this.items.filter(
      (user) =>
        (!query.name || user.name.toLowerCase().includes(query.name.toLowerCase())) &&
        (!query.email || user.email.toLowerCase().includes(query.email.toLowerCase())) &&
        (!query.username || user.username.toLowerCase().includes(query.username.toLowerCase())),
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const data = filtered.slice((page - 1) * limit, page * limit);

    return {
      data,
      totalCount: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      currentPage: page,
    };
  }

  async create(user: User): Promise<void> {
    this.items.push(user);
  }

  async save(user: User): Promise<void> {
    const index = this.items.findIndex((item) => item.publicId === user.publicId);

    if (index >= 0) {
      this.items[index] = user;
    }
  }

  async delete(user: User): Promise<void> {
    const index = this.items.findIndex((item) => item.publicId === user.publicId);

    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  async deleteExpiredUnverified(now: Date): Promise<number> {
    const expired = this.items.filter(
      (user) =>
        user.emailVerifiedAt === null &&
        user.emailVerificationTokenExpiresAt !== null &&
        user.emailVerificationTokenExpiresAt < now,
    );

    this.items = this.items.filter((user) => !expired.includes(user));

    return expired.length;
  }
}
