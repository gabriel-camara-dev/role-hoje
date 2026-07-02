import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ForbiddenError } from '../errors/forbidden-error';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';
import type { UserRole } from '../../../enterprise/entities/user-role';
import { UserAlreadyExistsError } from './errors/user-already-exists-error';
import { PasswordHasher } from './password-hasher';

interface UpdateUserUseCaseRequest {
  currentUserPublicId: string;
  currentUserRole: UserRole;
  publicId: string;
  name?: string;
  username?: string;
  email?: string;
  password?: string;
}

type UpdateUserUseCaseResponse = Result<
  ResourceNotFoundError | UserAlreadyExistsError | ForbiddenError,
  {
    user: User;
  }
>;

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(UsersRepository) private usersRepository: UsersRepository,
    @Inject(PasswordHasher) private passwordHasher: PasswordHasher,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute({
    currentUserPublicId,
    currentUserRole,
    publicId,
    password,
    ...data
  }: UpdateUserUseCaseRequest): Promise<UpdateUserUseCaseResponse> {
    if (currentUserPublicId !== publicId && currentUserRole !== 'ADMIN') {
      return fail(new ForbiddenError('Only the account owner or an admin can update this user'));
    }

    const userExists = await this.usersRepository.findBy({ publicId });

    if (!userExists) {
      return fail(new ResourceNotFoundError('User not found'));
    }

    const userWithSameFields = await this.usersRepository.findConflict({
      email: data.email,
      username: data.username,
      ignoredPublicId: publicId,
    });

    if (userWithSameFields) {
      return fail(new UserAlreadyExistsError());
    }

    const user = await this.usersRepository.updateById(userExists.id, {
      ...data,
      ...(password
        ? {
            passwordHash: await this.passwordHasher.hash(password),
            passwordChangedAt: new Date(),
          }
        : {}),
    });

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'user.updated',
        aggregateId: user.publicId,
        payload: {
          id: user.publicId,
          changedFields: Object.keys({ ...data, ...(password ? { password: true } : {}) }),
        },
        recipientIds: [user.publicId],
      }),
    );

    return success({ user });
  }
}
