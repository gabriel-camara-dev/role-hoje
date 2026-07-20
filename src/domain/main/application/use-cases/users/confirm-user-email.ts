import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { emailVerificationTokenHash } from './email-verification-token';

interface ConfirmUserEmailUseCaseRequest {
  token: string;
}

type ConfirmUserEmailUseCaseResponse = Result<ResourceNotFoundError, { user: User }>;

@Injectable()
export class ConfirmUserEmailUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute({ token }: ConfirmUserEmailUseCaseRequest): Promise<ConfirmUserEmailUseCaseResponse> {
    const tokenHash = emailVerificationTokenHash(token);
    const user = await this.usersRepository.findByEmailVerificationTokenHash(tokenHash);

    if (!user?.emailVerificationTokenExpiresAt) {
      return fail(new ResourceNotFoundError('Email confirmation link not found or expired'));
    }

    if (user.emailVerificationTokenExpiresAt < new Date()) {
      await this.usersRepository.delete(user);

      return fail(new ResourceNotFoundError('Email confirmation link not found or expired'));
    }

    user.verifyEmail();
    await this.usersRepository.save(user);

    return success({ user });
  }
}
