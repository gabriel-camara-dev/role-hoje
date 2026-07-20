import type { Group } from '../../../enterprise/entities/onde-hoje/groups/group';
import type { GroupDetails } from '../../../enterprise/entities/onde-hoje/groups/value-objects/group-details';
import type { GroupSummary } from '../../../enterprise/entities/onde-hoje/groups/value-objects/group-summary';
import type { MyGroupDetails } from '../../../enterprise/entities/onde-hoje/groups/value-objects/my-group-details';

export interface ListPublicGroupsQuery {
  city?: string;
}

export abstract class GroupsRepository {
  abstract findById(id: string): Promise<Group | null>;
  abstract findByName(name: string): Promise<Group | null>;
  /** Public groups only: a private group is invisible to whoever is not in it. */
  abstract findPublicDetailsById(id: string): Promise<GroupDetails | null>;
  abstract findManyPublicSummaries(query: ListPublicGroupsQuery): Promise<GroupSummary[]>;
  abstract findManyDetailsByMemberId(memberId: string): Promise<MyGroupDetails[]>;
  abstract create(group: Group): Promise<void>;
  abstract save(group: Group): Promise<void>;
  abstract delete(group: Group): Promise<void>;
}
