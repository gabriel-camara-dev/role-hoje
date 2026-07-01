import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { UsersRepository } from '../../repositories/users-repository';

interface DeleteUserUseCaseRequest {
  publicId: string;
}

type DeleteUserUseCaseResponse = Result<ResourceNotFoundError, null>;

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(UsersRepository) private usersRepository: UsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute({ publicId }: DeleteUserUseCaseRequest): Promise<DeleteUserUseCaseResponse> {
    const userExists = await this.usersRepository.findBy({ publicId });

    if (!userExists) {
      return fail(new ResourceNotFoundError('User not found'));
    }

    await this.usersRepository.deleteById(userExists.id);

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'user.deleted',
        aggregateId: userExists.publicId,
        payload: {
          id: userExists.publicId,
        },
        recipientIds: [userExists.publicId],
      }),
    );

    return success(null);
  }
}
