import { Inject, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';
import { UserAlreadyExistsError } from './errors/user-already-exists-error';

interface UpdateUserUseCaseRequest {
  publicId: string;
  name?: string;
  username?: string;
  email?: string;
  cpf?: string;
  password?: string;
}

type UpdateUserUseCaseResponse = Result<
  ResourceNotFoundError | UserAlreadyExistsError,
  {
    user: User;
  }
>;

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute({ publicId, password, ...data }: UpdateUserUseCaseRequest): Promise<UpdateUserUseCaseResponse> {
    const userExists = await this.usersRepository.findBy({ publicId });

    if (!userExists) {
      return fail(new ResourceNotFoundError('User not found'));
    }

    const userWithSameFields = await this.usersRepository.findConflict({
      email: data.email,
      username: data.username,
      cpf: data.cpf,
      ignoredPublicId: publicId,
    });

    if (userWithSameFields) {
      return fail(new UserAlreadyExistsError());
    }

    const user = await this.usersRepository.updateById(userExists.id, {
      ...data,
      ...(password
        ? {
            passwordHash: await hash(password, 8),
            passwordChangedAt: new Date(),
          }
        : {}),
    });

    return success({ user });
  }
}
