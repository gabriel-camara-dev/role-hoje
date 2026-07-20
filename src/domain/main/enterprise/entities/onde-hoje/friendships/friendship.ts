import { AggregateRoot } from '@/core/entities/aggregate-root';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { Optional } from '@/core/types/optional';
import { FriendshipAcceptedEvent } from '../../../events/onde-hoje/friendships/friendship-accepted-event';
import { FriendshipRequestedEvent } from '../../../events/onde-hoje/friendships/friendship-requested-event';

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

/** The read model a friends listing returns: the other person plus how we relate. */
export interface FriendListItem {
  status: FriendshipStatus;
  direction: 'sent' | 'received';
  friend: {
    publicId: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

export interface FriendshipProps {
  requesterId: UniqueEntityID;
  addresseeId: UniqueEntityID;
  status: FriendshipStatus;
  createdAt: Date;
}

/**
 * The `friendships` table has no `publicId`; a friendship is identified by the
 * unordered pair of its two users. {@link pairKey} is that canonical key, and
 * repositories dedupe on it in both directions.
 *
 * Status transitions raise domain events; the repository dispatches them after
 * the row is saved, and subscribers turn them into notifications.
 */
export class Friendship extends AggregateRoot<FriendshipProps> {
  get requesterId() {
    return this.props.requesterId;
  }

  get addresseeId() {
    return this.props.addresseeId;
  }

  get status() {
    return this.props.status;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get isPending() {
    return this.props.status === 'PENDING';
  }

  get isAccepted() {
    return this.props.status === 'ACCEPTED';
  }

  get isBlocked() {
    return this.props.status === 'BLOCKED';
  }

  /** Order-independent identity of the pair, so A→B and B→A collapse to one row. */
  get pairKey() {
    return [this.props.requesterId.toString(), this.props.addresseeId.toString()].sort().join(':');
  }

  /** Opens (or renews) the request: the addressee gets notified. */
  request() {
    this.props.status = 'PENDING';
    this.addDomainEvent(new FriendshipRequestedEvent(this));
  }

  /** The addressee accepts: the original requester gets notified. */
  accept() {
    this.props.status = 'ACCEPTED';
    this.addDomainEvent(new FriendshipAcceptedEvent(this));
  }

  static create(props: Optional<FriendshipProps, 'status' | 'createdAt'>, id?: UniqueEntityID) {
    return new Friendship(
      {
        ...props,
        status: props.status ?? 'PENDING',
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
  }
}
