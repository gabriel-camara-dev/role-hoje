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

    const username = await this.generateAvailableUsername(request.email, request.name);

    const user = await this.usersRepository.create({
      name: request.name,
      username,
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
          username: user.username,
          email: user.email,
          role: user.role,
        },
        recipientIds: [user.publicId],
      }),
    );

    return success({ user });
  }

  private async generateAvailableUsername(email: string, name: string) {
    const baseUsername = slugUsername(email.split('@')[0] || name);

    for (let index = 0; index < 100; index += 1) {
      const username = index === 0 ? baseUsername : `${baseUsername}_${index + 1}`;
      const existingUser = await this.usersRepository.findBy({ username });

      if (!existingUser) {
        return username;
      }
    }

    return `${baseUsername}_${Date.now().toString(36)}`;
  }
}

function slugUsername(value: string) {
  const username = value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9_]/g, '_')
    .replaceAll(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

  return username.length >= 3 ? username : `user_${username || 'new'}`;
}
