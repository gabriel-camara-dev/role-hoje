import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { DomainEvent } from '@/core/events/domain-event';
import type { GroupMember } from '../../../entities/onde-hoje/groups/group-member';

/** An invited person accepted the invite. The group owner is notified. The actor is the member themselves. */
export class GroupInviteAcceptedEvent implements DomainEvent {
  public occurredAt: Date;

  constructor(public readonly groupMember: GroupMember) {
    this.occurredAt = new Date();
  }

  getAggregateId(): UniqueEntityID {
    return this.groupMember.groupId;
  }
}
