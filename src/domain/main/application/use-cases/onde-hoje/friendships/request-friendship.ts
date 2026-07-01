import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { FriendshipsRepository } from '../../../repositories/onde-hoje/friendships-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import type { FriendshipStatus } from '../../../../enterprise/entities/onde-hoje/friendships/friendship';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface RequestFriendshipUseCaseRequest {
  currentUserPublicId: string;
  addresseePublicId: string;
}

type RequestFriendshipUseCaseResponse = Result<ResourceNotFoundError, { status: FriendshipStatus }>;

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

    const status = await this.friendshipsRepository.requestFriendship({
      requesterId: user.id,
      addresseePublicId: request.addresseePublicId,
    });

    if (!status) {
      return fail(new ResourceNotFoundError('User not found'));
    }

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.friendship.requested',
        actorId: request.currentUserPublicId,
        aggregateId: `${request.currentUserPublicId}:${request.addresseePublicId}`,
        payload: {
          requesterId: request.currentUserPublicId,
          addresseeId: request.addresseePublicId,
          status,
        },
        recipientIds: [request.addresseePublicId],
      }),
    );

    return success({ status });
  }
}
