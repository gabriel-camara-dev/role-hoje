import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { UserRole } from '@/domain/main/enterprise/entities/user-role';
import { ForbiddenError } from '../errors/forbidden-error';
import { type ListUsersQuery, type ListUsersResult, UsersRepository } from '../../repositories/users-repository';

interface ListUsersUseCaseRequest extends ListUsersQuery {
  currentUserRole: UserRole;
}

type ListUsersUseCaseResponse = Result<
  ForbiddenError,
  {
    users: ListUsersResult;
  }
>;

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute(query: ListUsersUseCaseRequest): Promise<ListUsersUseCaseResponse> {
    if (query.currentUserRole !== 'ADMIN') {
      return fail(new ForbiddenError('Admin access required'));
    }

    const users = await this.usersRepository.list(query);

    return success({ users });
  }
}
