import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { DomainEvent } from '@/core/events/domain-event';
import type { GroupMember } from '../../../entities/onde-hoje/groups/group-member';

/** An active member invited someone. The invited person is notified. */
export class GroupMemberInvitedEvent implements DomainEvent {
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
