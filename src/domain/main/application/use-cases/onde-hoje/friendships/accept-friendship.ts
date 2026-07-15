import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { FriendshipsRepository } from '../../../repositories/onde-hoje/friendships-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import type { FriendshipStatus } from '../../../../enterprise/entities/onde-hoje/friendships/friendship';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';

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
    @Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher,
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

    const status = await this.friendshipsRepository.acceptFriendship({
      addresseeId: user.id,
      requesterId: requester.id,
    });

    if (!status) {
      return fail(new ResourceNotFoundError('Friend request not found'));
    }

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.friendship.accepted',
        actorId: request.currentUserPublicId,
        aggregateId: `${request.requesterUsername}:${request.currentUserPublicId}`,
        payload: {
          requesterUsername: request.requesterUsername,
          addresseeId: request.currentUserPublicId,
          status,
        },
        recipientIds: [request.currentUserPublicId],
      }),
    );

    await this.notificationDispatcher.dispatch({
      recipientPublicId: requester.publicId,
      actorPublicId: request.currentUserPublicId,
      type: 'FRIEND_ACCEPTED',
      title: 'Pedido de amizade aceito',
      body: 'Voces agora sao amigos.',
      data: {},
    });

    return success({ status });
  }
}
