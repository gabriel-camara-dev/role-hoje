import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import { type ListUsersQuery, type ListUsersResult, UsersRepository } from '../../repositories/users-repository';

interface ListUsersUseCaseRequest extends ListUsersQuery {}

type ListUsersUseCaseResponse = Result<
  never,
  {
    users: ListUsersResult;
  }
>;

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute(query: ListUsersUseCaseRequest): Promise<ListUsersUseCaseResponse> {
    const users = await this.usersRepository.list(query);

    return success({ users });
  }
}
