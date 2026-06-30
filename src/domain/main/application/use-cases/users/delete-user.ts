import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { UsersRepository } from '../../repositories/users-repository';

interface DeleteUserUseCaseRequest {
  publicId: string;
}

type DeleteUserUseCaseResponse = Result<ResourceNotFoundError, null>;

@Injectable()
export class DeleteUserUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute({ publicId }: DeleteUserUseCaseRequest): Promise<DeleteUserUseCaseResponse> {
    const userExists = await this.usersRepository.findBy({ publicId });

    if (!userExists) {
      return fail(new ResourceNotFoundError('User not found'));
    }

    await this.usersRepository.deleteById(userExists.id);

    return success(null);
  }
}
