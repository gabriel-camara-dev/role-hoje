import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { FriendshipsRepository } from '../../../repositories/onde-hoje/friendships-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import type { FriendshipStatus } from '../../../../enterprise/entities/onde-hoje/friendships/friendship';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface AcceptFriendshipUseCaseRequest {
  currentUserPublicId: string;
  requesterPublicId: string;
}

type AcceptFriendshipUseCaseResponse = Result<ResourceNotFoundError, { status: FriendshipStatus }>;

@Injectable()
export class AcceptFriendshipUseCase {
  constructor(
    @Inject(FriendshipsRepository) private friendshipsRepository: FriendshipsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: AcceptFriendshipUseCaseRequest): Promise<AcceptFriendshipUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const status = await this.friendshipsRepository.acceptFriendship({
      addresseeId: user.id,
      requesterPublicId: request.requesterPublicId,
    });

    if (!status) {
      return fail(new ResourceNotFoundError('Friend request not found'));
    }

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.friendship.accepted',
        actorId: request.currentUserPublicId,
        aggregateId: `${request.requesterPublicId}:${request.currentUserPublicId}`,
        payload: {
          requesterId: request.requesterPublicId,
          addresseeId: request.currentUserPublicId,
          status,
        },
        recipientIds: [request.requesterPublicId, request.currentUserPublicId],
      }),
    );

    return success({ status });
  }
}
