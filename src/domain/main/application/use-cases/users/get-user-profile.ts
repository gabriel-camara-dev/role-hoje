import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';

interface GetUserProfileUseCaseRequest {
  publicId: string;
}

type GetUserProfileUseCaseResponse = Result<
  ResourceNotFoundError,
  {
    user: User;
  }
>;

@Injectable()
export class GetUserProfileUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute({ publicId }: GetUserProfileUseCaseRequest): Promise<GetUserProfileUseCaseResponse> {
    const user = await this.usersRepository.findBy({ publicId });

    if (!user) {
      return fail(new ResourceNotFoundError('User not found'));
    }

    return success({ user });
  }
}
