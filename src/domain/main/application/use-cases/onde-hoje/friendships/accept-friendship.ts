import { Inject, Injectable } from '@nestjs/common';
import { createIntegrationEvent } from '@/core/events/integration-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { FriendshipStatus } from '../../../../enterprise/entities/onde-hoje/friendships/friendship';
import { FriendshipsRepository } from '../../../repositories/onde-hoje/friendships-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface AcceptFriendshipUseCaseRequest {
  currentUserPublicId: string;
  requesterUsername: string;
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

    const requester = await this.usersRepository.findByUsername(request.requesterUsername);

    if (!requester) {
      return fail(new ResourceNotFoundError('Friend request not found'));
    }

    const friendship = await this.friendshipsRepository.findByUsers({
      requesterId: requester.publicId,
      addresseeId: user.publicId,
    });

    // Only the addressee of a still-pending request may accept it.
    if (!friendship?.isPending || friendship.addresseeId.toString() !== user.publicId) {
      return fail(new ResourceNotFoundError('Friend request not found'));
    }

    // Raises FriendshipAcceptedEvent; OnFriendshipAccepted notifies the requester.
    friendship.accept();

    await this.friendshipsRepository.save(friendship);

    await this.eventBus.publish(
      createIntegrationEvent({
        eventName: 'onde-hoje.friendship.accepted',
        actorId: request.currentUserPublicId,
        aggregateId: `${request.requesterUsername}:${request.currentUserPublicId}`,
        payload: {
          requesterUsername: request.requesterUsername,
          addresseeId: request.currentUserPublicId,
          status: friendship.status,
        },
        recipientIds: [request.currentUserPublicId],
      }),
    );

    return success({ status: friendship.status });
  }
}
