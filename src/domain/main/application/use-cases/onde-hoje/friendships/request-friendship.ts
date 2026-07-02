import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { FriendshipsRepository } from '../../../repositories/onde-hoje/friendships-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import type { FriendshipStatus } from '../../../../enterprise/entities/onde-hoje/friendships/friendship';
import { ConflictError } from '../../errors/conflict-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface RequestFriendshipUseCaseRequest {
  currentUserPublicId: string;
  addresseeUsername: string;
}

type RequestFriendshipUseCaseResponse = Result<ResourceNotFoundError | ConflictError, { status: FriendshipStatus }>;

@Injectable()
export class RequestFriendshipUseCase {
  constructor(
    @Inject(FriendshipsRepository) private friendshipsRepository: FriendshipsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: RequestFriendshipUseCaseRequest): Promise<RequestFriendshipUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const friendship = await this.friendshipsRepository.requestFriendship({
      requesterId: user.id,
      addresseeUsername: request.addresseeUsername,
    });

    if (friendship.type === 'not_found') {
      return fail(new ResourceNotFoundError('User not found'));
    }

    if (friendship.type === 'already_exists') {
      return fail(new ConflictError(`Friendship is already ${friendship.status.toLowerCase()}`));
    }

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.friendship.requested',
        actorId: request.currentUserPublicId,
        aggregateId: `${request.currentUserPublicId}:${request.addresseeUsername}`,
        payload: {
          requesterId: request.currentUserPublicId,
          addresseeUsername: request.addresseeUsername,
          status: friendship.status,
        },
      }),
    );

    return success({ status: friendship.status });
  }
}
