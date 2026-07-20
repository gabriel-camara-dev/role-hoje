import { ValueObject } from '@/core/entities/value-object';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { GroupPrivacy } from '../group';

export interface GroupSummaryProps {
  groupId: UniqueEntityID;
  name: string;
  slug: string;
  description: string | null;
  privacy: GroupPrivacy;
  city: string | null;
  state: string | null;
  membersCount: number;
  todayVotesCount: number;
}

/**
 * A group as a listing shows it: the group plus the counts that live in
 * `group_member` / `place_vote`, without loading the members themselves.
 * Never carries `passwordHash`.
 */
export class GroupSummary extends ValueObject<GroupSummaryProps> {
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

  get membersCount() {
    return this.props.membersCount;
  }

  get todayVotesCount() {
    return this.props.todayVotesCount;
  }

  static create(props: GroupSummaryProps) {
    return new GroupSummary(props);
  }
}
