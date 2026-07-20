import { Inject, Injectable } from '@nestjs/common';
import { createIntegrationEvent } from '@/core/events/integration-event';
import { EventBus } from '@/core/events/event-bus';
import { EmailSender } from '@/domain/main/application/mail/email-sender';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { UsersRepository } from '../../repositories/users-repository';
import { User } from '../../../enterprise/entities/user';
import { UserAlreadyExistsError } from './errors/user-already-exists-error';
import { PasswordHasher } from './password-hasher';
import { generateEmailVerificationToken } from './email-verification-token';

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
    @Inject(EmailSender) private emailSender: EmailSender,
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
    const emailVerificationToken = generateEmailVerificationToken();

    const user = User.create({
      name,
      username,
      email,
      passwordHash,
      emailVerificationTokenHash: emailVerificationToken.tokenHash,
      emailVerificationTokenExpiresAt: emailVerificationToken.expiresAt,
    });

    await this.usersRepository.create(user);

    await this.emailSender.sendEmailConfirmation({
      email: user.email,
      name: user.name,
      token: emailVerificationToken.token,
    });

    await this.eventBus.publish(
      createIntegrationEvent({
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
