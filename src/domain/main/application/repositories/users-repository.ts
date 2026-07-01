import type { PaginatedResults, PaginationParams } from '@/core/types/pagination';
import type { CreateUserData, UpdateUserData, User } from '@/domain/main/enterprise/entities/user';

export interface FindUserBy {
  id?: number;
  publicId?: string;
  email?: string;
  username?: string;
  cpf?: string;
  googleId?: string;
  token?: string;
}

export interface FindUserConflict {
  email?: string;
  username?: string;
  cpf?: string;
  ignoredPublicId?: string;
}

export interface ListUsersQuery extends PaginationParams {
  name?: string;
  username?: string;
  email?: string;
  cpf?: string;
}

export interface ListUsersResult extends PaginatedResults<User> {}

export abstract class UsersRepository {
  abstract create(data: CreateUserData): Promise<User>;
  abstract findBy(findUserBy: FindUserBy): Promise<User | null>;
  abstract findByLogin(login: string): Promise<User | null>;
  abstract findConflict(data: FindUserConflict): Promise<User | null>;
  abstract list(query: ListUsersQuery): Promise<ListUsersResult>;
  abstract updateById(id: number, data: UpdateUserData): Promise<User>;
  abstract deleteById(id: number): Promise<User>;
}
