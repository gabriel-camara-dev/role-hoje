import type { PaginatedResults, PaginationParams } from '@/core/types/pagination';
import type { User } from '@/domain/main/enterprise/entities/user';

export interface FindUserConflict {
  username?: string;
  email?: string;
  ignoredPublicId?: string;
}

export interface ListUsersQuery extends PaginationParams {
  name?: string;
  email?: string;
  username?: string;
}

export interface ListUsersResult extends PaginatedResults<User> {}

export abstract class UsersRepository {
  abstract findByPublicId(publicId: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByUsername(username: string): Promise<User | null>;
  abstract findByGoogleId(googleId: string): Promise<User | null>;
  abstract findByEmailVerificationTokenHash(tokenHash: string): Promise<User | null>;
  /** Matches a username or email — the login form accepts either. */
  abstract findByLogin(login: string): Promise<User | null>;
  abstract findConflict(data: FindUserConflict): Promise<User | null>;
  abstract list(query: ListUsersQuery): Promise<ListUsersResult>;
  abstract create(user: User): Promise<void>;
  abstract save(user: User): Promise<void>;
  abstract delete(user: User): Promise<void>;
  abstract deleteExpiredUnverified(now: Date): Promise<number>;
}
