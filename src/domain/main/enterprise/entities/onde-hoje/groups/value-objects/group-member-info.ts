import { ValueObject } from '@/core/entities/value-object';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { GroupMemberRole } from '../group-member';
import type { GroupMemberStatus } from '../group-membership';

export interface GroupMemberInfoProps {
  memberId: UniqueEntityID;
  name: string;
  username: string;
  avatarUrl: string | null;
  role: GroupMemberRole;
  status: GroupMemberStatus;
}

/** A member of a group as it is shown in a listing: the membership plus who it is. */
export class GroupMemberInfo extends ValueObject<GroupMemberInfoProps> {
  get memberId() {
    return this.props.memberId;
  }

  get name() {
    return this.props.name;
  }

  get username() {
    return this.props.username;
  }

  get avatarUrl() {
    return this.props.avatarUrl;
  }

  get role() {
    return this.props.role;
  }

  get status() {
    return this.props.status;
  }

  static create(props: GroupMemberInfoProps) {
    return new GroupMemberInfo(props);
  }
}
