import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';

interface AuthenticateUserWithGoogleUseCaseRequest {
  googleId: string;
  email: string;
  name: string;
}

type AuthenticateUserWithGoogleUseCaseResponse = Result<never, { user: User }>;

@Injectable()
export class AuthenticateUserWithGoogleUseCase {
  constructor(
    @Inject(UsersRepository) private usersRepository: UsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: AuthenticateUserWithGoogleUseCaseRequest): Promise<AuthenticateUserWithGoogleUseCaseResponse> {
    const userByGoogleId = await this.usersRepository.findBy({ googleId: request.googleId });

    if (userByGoogleId) {
      const authenticatedUser = await this.usersRepository.updateById(userByGoogleId.id, {
        lastLogin: new Date(),
      });

      return success({ user: authenticatedUser });
    }

    const userByEmail = await this.usersRepository.findBy({ email: request.email });

    if (userByEmail) {
      const linkedUser = await this.usersRepository.updateById(userByEmail.id, {
        googleId: request.googleId,
        lastLogin: new Date(),
      });

      return success({ user: linkedUser });
    }

    const user = await this.usersRepository.create({
      name: request.name,
      email: request.email,
      passwordHash: null,
      googleId: request.googleId,
      lastLogin: new Date(),
    });

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'user.created-with-google',
        aggregateId: user.publicId,
        payload: {
          id: user.publicId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        recipientIds: [user.publicId],
      }),
    );

    return success({ user });
  }
}
