import { randomBytes } from 'node:crypto';
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
      return success({ user: userByGoogleId });
    }

    const userByEmail = await this.usersRepository.findBy({ email: request.email });

    if (userByEmail) {
      const linkedUser = await this.usersRepository.updateById(userByEmail.id, {
        googleId: request.googleId,
        lastLogin: new Date(),
      });

      return success({ user: linkedUser });
    }

    const username = await this.generateUsername(request.email);
    const user = await this.usersRepository.create({
      name: request.name,
      username,
      email: request.email,
      cpf: null,
      passwordHash: null,
      googleId: request.googleId,
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

  private async generateUsername(email: string) {
    const baseUsername = email
      .split('@')[0]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);

    let username = baseUsername || `user_${randomBytes(3).toString('hex')}`;
    let conflict = await this.usersRepository.findConflict({ username });

    while (conflict) {
      username = `${baseUsername || 'user'}_${randomBytes(3).toString('hex')}`.slice(0, 32);
      conflict = await this.usersRepository.findConflict({ username });
    }

    return username;
  }
}
