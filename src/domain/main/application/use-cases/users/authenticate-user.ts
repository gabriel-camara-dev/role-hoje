import { Inject, Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { InvalidCredentialsError } from '../errors/invalid-credentials-error';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';

interface AuthenticateUserUseCaseRequest {
  login: string;
  password: string;
}

type AuthenticateUserUseCaseResponse = Result<
  InvalidCredentialsError,
  {
    user: User;
  }
>;

const dummyHash = '$2a$12$tlPzU0pvKy33GEnCkOCipeNJC1Ho4NHro4XwveiXUM5xChZj3ua9y';

@Injectable()
export class AuthenticateUserUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute({ login, password }: AuthenticateUserUseCaseRequest): Promise<AuthenticateUserUseCaseResponse> {
    const user = await this.usersRepository.findByLogin(login);
    const hashToCompare = user?.passwordHash ?? dummyHash;
    const doesPasswordMatch = await compare(password, hashToCompare);

    if (!user || !doesPasswordMatch) {
      return fail(new InvalidCredentialsError());
    }

    return success({ user });
  }
}
