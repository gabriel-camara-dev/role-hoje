import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { DomainEvent } from '@/core/events/domain-event';
import type { GroupMember } from '../../../entities/onde-hoje/groups/group-member';

/** An owner accepted a pending join request. The accepted member is notified. */
export class GroupMemberAcceptedEvent implements DomainEvent {
  public occurredAt: Date;

  constructor(
    public readonly groupMember: GroupMember,
    public readonly actorId: UniqueEntityID,
  ) {
    this.occurredAt = new Date();
  }

  getAggregateId(): UniqueEntityID {
    return this.groupMember.groupId;
  }
}
