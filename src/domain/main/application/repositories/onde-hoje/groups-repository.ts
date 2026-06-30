import type { CreateGroupData, Group } from '../../../enterprise/entities/onde-hoje/groups/group';
import type { GroupMembership } from '../../../enterprise/entities/onde-hoje/groups/group-membership';

export interface ListPublicGroupsQuery {
  city?: string;
}

export abstract class GroupsRepository {
  abstract listPublic(query: ListPublicGroupsQuery): Promise<Group[]>;
  abstract create(data: CreateGroupData): Promise<Group>;
  abstract join(data: { userId: number; groupPublicId: string }): Promise<GroupMembership | null>;
}

