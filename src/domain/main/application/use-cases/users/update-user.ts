import { Inject, Injectable } from '@nestjs/common';
import { createIntegrationEvent } from '@/core/events/integration-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ForbiddenError } from '../errors/forbidden-error';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';
import type { UserRole } from '../../../enterprise/entities/user-role';
import { UserAlreadyExistsError } from './errors/user-already-exists-error';

interface UpdateUserUseCaseRequest {
  currentUserPublicId: string;
  currentUserRole: UserRole;
  publicId: string;
  name?: string;
  username?: string;
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
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute({
    currentUserPublicId,
    currentUserRole,
    publicId,
    ...data
  }: UpdateUserUseCaseRequest): Promise<UpdateUserUseCaseResponse> {
    if (currentUserPublicId !== publicId && currentUserRole !== 'ADMIN') {
      return fail(new ForbiddenError('Only the account owner or an admin can update this user'));
    }

    const userExists = await this.usersRepository.findByPublicId(publicId);

    if (!userExists) {
      return fail(new ResourceNotFoundError('User not found'));
    }

    const userWithSameUsername = await this.usersRepository.findConflict({
      username: data.username,
      ignoredPublicId: publicId,
    });

    if (userWithSameUsername) {
      return fail(new UserAlreadyExistsError('username'));
    }

    userExists.updateProfile(data);
    await this.usersRepository.save(userExists);

    const user = userExists;

    await this.eventBus.publish(
      createIntegrationEvent({
        eventName: 'user.updated',
        aggregateId: user.publicId,
        payload: {
          id: user.publicId,
          changedFields: Object.keys(data),
        },
        recipientIds: [user.publicId],
      }),
    );

    return success({ user });
  }
}
