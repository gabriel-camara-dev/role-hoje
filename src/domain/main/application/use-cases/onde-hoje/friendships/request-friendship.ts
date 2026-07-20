import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { createIntegrationEvent } from '@/core/events/integration-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { Friendship, type FriendshipStatus } from '../../../../enterprise/entities/onde-hoje/friendships/friendship';
import { FriendshipsRepository } from '../../../repositories/onde-hoje/friendships-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
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

    const addressee = await this.usersRepository.findByUsername(request.addresseeUsername);

    if (!addressee || addressee.publicId === user.publicId) {
      return fail(new ResourceNotFoundError('User not found'));
    }

    const existing = await this.friendshipsRepository.findByUsers({
      requesterId: user.publicId,
      addresseeId: addressee.publicId,
    });

    if (existing?.isAccepted || existing?.isBlocked) {
      return fail(new ConflictError(`Friendship is already ${existing.status.toLowerCase()}`));
    }

    // Rebuilt for the current direction, so the notification reaches the person
    // being asked even when an older pending row pointed the other way.
    const friendship = Friendship.create({
      requesterId: new UniqueEntityID(user.publicId),
      addresseeId: new UniqueEntityID(addressee.publicId),
    });

    // Raises FriendshipRequestedEvent; OnFriendshipRequested notifies the addressee.
    friendship.request();

    if (existing) {
      await this.friendshipsRepository.save(friendship);
    } else {
      await this.friendshipsRepository.create(friendship);
    }

    await this.eventBus.publish(
      createIntegrationEvent({
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
