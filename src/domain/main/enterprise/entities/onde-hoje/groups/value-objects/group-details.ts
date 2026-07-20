import { ValueObject } from '@/core/entities/value-object';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { GroupPrivacy } from '../group';
import type { GroupMemberInfo } from './group-member-info';

export interface GroupDetailsProps {
  groupId: UniqueEntityID;
  name: string;
  slug: string;
  description: string | null;
  privacy: GroupPrivacy;
  city: string | null;
  state: string | null;
  members: GroupMemberInfo[];
  membersCount: number;
  todayVotesCount: number;
}

/**
 * A single group with its members loaded — what a group page shows.
 * Never carries `passwordHash`.
 */
export class GroupDetails extends ValueObject<GroupDetailsProps> {
  get groupId() {
    return this.props.groupId;
  }

  get name() {
    return this.props.name;
  }

  get slug() {
    return this.props.slug;
  }

  get description() {
    return this.props.description;
  }

  get privacy() {
    return this.props.privacy;
  }

  get city() {
    return this.props.city;
  }

  get state() {
    return this.props.state;
  }

  get members() {
    return this.props.members;
  }

  get membersCount() {
    return this.props.membersCount;
  }

  get todayVotesCount() {
    return this.props.todayVotesCount;
  }

  static create(props: GroupDetailsProps) {
    return new GroupDetails(props);
  }
}
