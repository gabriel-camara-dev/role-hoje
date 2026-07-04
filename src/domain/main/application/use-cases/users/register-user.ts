import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';
import { UserAlreadyExistsError } from './errors/user-already-exists-error';
import { PasswordHasher } from './password-hasher';

interface RegisterUserUseCaseRequest {
  name: string;
  username: string;
  email: string;
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
  constructor(
    @Inject(UsersRepository) private usersRepository: UsersRepository,
    @Inject(PasswordHasher) private passwordHasher: PasswordHasher,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute({ name, username, email, password }: RegisterUserUseCaseRequest): Promise<RegisterUserUseCaseResponse> {
    const userWithSameEmail = await this.usersRepository.findConflict({ email });

    if (userWithSameEmail) {
      return fail(new UserAlreadyExistsError('email'));
    }

    const userWithSameUsername = await this.usersRepository.findConflict({ username });

    if (userWithSameUsername) {
      return fail(new UserAlreadyExistsError('username'));
    }

    const passwordHash = await this.passwordHasher.hash(password);

    const user = await this.usersRepository.create({
      name,
      username,
      email,
      passwordHash,
    });

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'user.created',
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
}
