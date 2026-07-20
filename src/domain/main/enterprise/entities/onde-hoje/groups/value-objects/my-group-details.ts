import { ValueObject } from '@/core/entities/value-object';
import type { GroupMemberRole } from '../group-member';
import type { GroupMemberStatus } from '../group-membership';
import type { GroupDetails } from './group-details';

export interface MyGroupDetailsProps {
  group: GroupDetails;
  myRole: GroupMemberRole;
  myStatus: GroupMemberStatus;
}

/** A group listed for someone who belongs to it, carrying their own standing in it. */
export class MyGroupDetails extends ValueObject<MyGroupDetailsProps> {
  get group() {
    return this.props.group;
  }

  get myRole() {
    return this.props.myRole;
  }

  get myStatus() {
    return this.props.myStatus;
  }

  static create(props: MyGroupDetailsProps) {
    return new MyGroupDetails(props);
  }
}
