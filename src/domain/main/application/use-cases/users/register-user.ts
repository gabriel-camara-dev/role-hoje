import { Inject, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';
import { UserAlreadyExistsError } from './errors/user-already-exists-error';

interface RegisterUserUseCaseRequest {
  name: string;
  username: string;
  email: string;
  cpf: string;
  password: string;
}

type RegisterUserUseCaseResponse = Result<
  UserAlreadyExistsError,
  {
    user: User;
  }
>;

@Injectable()
export class RegisterUserUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute({
    name,
    username,
    email,
    cpf,
    password,
  }: RegisterUserUseCaseRequest): Promise<RegisterUserUseCaseResponse> {
    const userWithSameFields = await this.usersRepository.findConflict({ email, username, cpf });

    if (userWithSameFields) {
      return fail(new UserAlreadyExistsError());
    }

    const passwordHash = await hash(password, 8);

    const user = await this.usersRepository.create({
      name,
      username,
      email,
      cpf,
      passwordHash,
    });

    return success({ user });
  }
}
