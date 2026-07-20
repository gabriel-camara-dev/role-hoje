import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { DomainEvent } from '@/core/events/domain-event';
import type { GroupMember } from '../../../entities/onde-hoje/groups/group-member';

/** Someone asked to join a private group. The owner is notified. The actor is the requester themselves. */
export class GroupJoinRequestedEvent implements DomainEvent {
  public occurredAt: Date;

  constructor(public readonly groupMember: GroupMember) {
    this.occurredAt = new Date();
  }

  getAggregateId(): UniqueEntityID {
    return this.groupMember.groupId;
  }
}
