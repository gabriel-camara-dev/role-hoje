import { Inject, Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
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
  constructor(
    @Inject(UsersRepository) private usersRepository: UsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute({ login, password }: AuthenticateUserUseCaseRequest): Promise<AuthenticateUserUseCaseResponse> {
    const user = await this.usersRepository.findByLogin(login);
    const hashToCompare = user?.passwordHash ?? dummyHash;
    const doesPasswordMatch = await compare(password, hashToCompare);

    if (!user?.passwordHash || !doesPasswordMatch) {
      return fail(new InvalidCredentialsError());
    }

    const authenticatedUser = await this.usersRepository.updateById(user.id, {
      lastLogin: new Date(),
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
