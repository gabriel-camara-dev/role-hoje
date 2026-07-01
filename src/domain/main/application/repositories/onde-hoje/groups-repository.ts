import type { CreateGroupData, Group } from '../../../enterprise/entities/onde-hoje/groups/group';
import type { GroupMembership } from '../../../enterprise/entities/onde-hoje/groups/group-membership';

export interface ListPublicGroupsQuery {
  city?: string;
}

export type AcceptGroupMemberResult =
  | { type: 'accepted'; membership: GroupMembership }
  | { type: 'not_found' }
  | { type: 'forbidden' }
  | { type: 'not_pending' };

export type JoinGroupResult =
  | { type: 'joined'; membership: GroupMembership }
  | { type: 'blocked' }
  | { type: 'not_found' };

export abstract class GroupsRepository {
  abstract listPublic(query: ListPublicGroupsQuery): Promise<Group[]>;
  abstract create(data: CreateGroupData): Promise<Group>;
  abstract join(data: { userId: number; groupPublicId: string }): Promise<JoinGroupResult>;
  abstract acceptMember(data: {
    leaderId: number;
    groupPublicId: string;
    memberPublicId: string;
  }): Promise<AcceptGroupMemberResult>;
}
