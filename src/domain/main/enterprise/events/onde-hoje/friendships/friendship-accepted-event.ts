import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { DomainEvent } from '@/core/events/domain-event';
import type { Friendship } from '../../../entities/onde-hoje/friendships/friendship';

/** A friend request was accepted. The requester is notified; the actor is the addressee. */
export class FriendshipAcceptedEvent implements DomainEvent {
  public occurredAt: Date;

  constructor(public readonly friendship: Friendship) {
    this.occurredAt = new Date();
  }

  getAggregateId(): UniqueEntityID {
    return this.friendship.id;
  }
}
