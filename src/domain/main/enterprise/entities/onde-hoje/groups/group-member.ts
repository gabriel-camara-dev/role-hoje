import { AggregateRoot } from '@/core/entities/aggregate-root';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { Optional } from '@/core/types/optional';
import { GroupInviteAcceptedEvent } from '../../../events/onde-hoje/groups/group-invite-accepted-event';
import { GroupJoinRequestedEvent } from '../../../events/onde-hoje/groups/group-join-requested-event';
import { GroupMemberAcceptedEvent } from '../../../events/onde-hoje/groups/group-member-accepted-event';
import { GroupMemberInvitedEvent } from '../../../events/onde-hoje/groups/group-member-invited-event';
import type { GroupMemberStatus } from './group-membership';

export type GroupMemberRole = 'OWNER' | 'MODERATOR' | 'MEMBER';

export interface GroupMemberProps {
  groupId: UniqueEntityID;
  memberId: UniqueEntityID;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  createdAt: Date;
}

/**
 * The `group_members` table has no `publicId` column, so this entity's own id is
 * never persisted: repositories key it by the natural `(groupId, memberId)`
 * pair, which the `uq_group_member` unique constraint already guarantees.
 *
 * Membership transitions raise domain events; the repository dispatches them
 * after the row is saved, and subscribers turn them into notifications.
 */
export class GroupMember extends AggregateRoot<GroupMemberProps> {
  get groupId() {
    return this.props.groupId;
  }

  get memberId() {
    return this.props.memberId;
  }

  get role() {
    return this.props.role;
  }

  get status() {
    return this.props.status;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get isActive() {
    return this.props.status === 'ACTIVE';
  }

  get isOwner() {
    return this.props.role === 'OWNER';
  }

  /** An owner may only act on the group while their own membership is active. */
  get leads() {
    return this.isOwner && this.isActive;
  }

  /** Admits the member with no notification (public join, or internal use). */
  activate() {
    this.props.status = 'ACTIVE';
  }

  /** An owner accepts a pending request: the accepted member gets notified. */
  acceptRequest(actorId: UniqueEntityID) {
    this.props.status = 'ACTIVE';
    this.addDomainEvent(new GroupMemberAcceptedEvent(this, actorId));
  }

  /** The invited person accepts: the owner gets notified. */
  acceptInvite() {
    this.props.status = 'ACTIVE';
    this.addDomainEvent(new GroupInviteAcceptedEvent(this));
  }

  /** An active member invites someone: the invitee gets notified. */
  inviteBy(actorId: UniqueEntityID) {
    this.props.status = 'INVITED';
    this.addDomainEvent(new GroupMemberInvitedEvent(this, actorId));
  }

  /** Someone asks to join: the owner gets notified. */
  requestToJoin() {
    this.props.status = 'PENDING';
    this.addDomainEvent(new GroupJoinRequestedEvent(this));
  }

  promoteToOwner() {
    this.props.role = 'OWNER';
  }

  static create(props: Optional<GroupMemberProps, 'role' | 'status' | 'createdAt'>, id?: UniqueEntityID) {
    return new GroupMember(
      {
        ...props,
        role: props.role ?? 'MEMBER',
        // A fresh membership is a request until something admits it.
        status: props.status ?? 'PENDING',
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
  }
}
