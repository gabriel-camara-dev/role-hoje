import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { DomainEvent } from '@/core/events/domain-event';
import type { Friendship } from '../../../entities/onde-hoje/friendships/friendship';

/** A friend request was opened. The addressee is notified; the actor is the requester. */
export class FriendshipRequestedEvent implements DomainEvent {
  public occurredAt: Date;

  constructor(public readonly friendship: Friendship) {
    this.occurredAt = new Date();
  }

  getAggregateId(): UniqueEntityID {
    return this.friendship.id;
  }
}
