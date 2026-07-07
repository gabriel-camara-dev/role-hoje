import { Inject, Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { InvalidCredentialsError } from '../errors/invalid-credentials-error';
import { AuthenticationAuditRepository } from '../../repositories/authentication-audit-repository';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';
import { EmailNotVerifiedError } from './errors/email-not-verified-error';

export interface AuthenticationContext {
  ipAddress?: string | null;
  remotePort?: string | null;
  userAgent?: string | null;
  origin?: string | null;
}

interface AuthenticateUserUseCaseRequest {
  login: string;
  password: string;
  context?: AuthenticationContext;
}

type AuthenticateUserUseCaseResponse = Result<
  InvalidCredentialsError | EmailNotVerifiedError,
  {
    user: User;
  }
>;

const dummyHash = '$2a$12$tlPzU0pvKy33GEnCkOCipeNJC1Ho4NHro4XwveiXUM5xChZj3ua9y';

@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    @Inject(UsersRepository) private usersRepository: UsersRepository,
    @Inject(AuthenticationAuditRepository) private authenticationAuditRepository: AuthenticationAuditRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute({
    login,
    password,
    context,
  }: AuthenticateUserUseCaseRequest): Promise<AuthenticateUserUseCaseResponse> {
    const user = await this.usersRepository.findByLogin(login);
    const hashToCompare = user?.passwordHash ?? dummyHash;
    const doesPasswordMatch = await compare(password, hashToCompare);

    if (!user?.passwordHash || !doesPasswordMatch) {
      await this.authenticationAuditRepository.record({
        status: user ? 'INCORRECT_PASSWORD' : 'USER_NOT_EXISTS',
        userId: user?.id ?? null,
        ...context,
      });

      return fail(new InvalidCredentialsError());
    }

    if (!user.emailVerifiedAt && user.role !== 'ADMIN') {
      return fail(new EmailNotVerifiedError());
    }

    const authenticatedUser = await this.usersRepository.updateById(user.id, {
      lastLogin: new Date(),
    });

    await this.authenticationAuditRepository.record({
      status: 'SUCCESS',
      userId: authenticatedUser.id,
      ...context,
    });

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'user.authenticated',
        aggregateId: authenticatedUser.publicId,
        payload: {
          id: authenticatedUser.publicId,
        },
        recipientIds: [authenticatedUser.publicId],
      }),
    );

    return success({ user: authenticatedUser });
  }
}
