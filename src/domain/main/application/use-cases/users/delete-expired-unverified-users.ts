import { Inject, Injectable } from '@nestjs/common';
import { UsersRepository } from '../../repositories/users-repository';

@Injectable()
export class DeleteExpiredUnverifiedUsersUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute(): Promise<{ deletedCount: number }> {
    const deletedCount = await this.usersRepository.deleteExpiredUnverified(new Date());

    return { deletedCount };
  }
}
