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

export interface GroupMemberListItem {
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED';
  role: 'OWNER' | 'MODERATOR' | 'MEMBER';
  user: {
    publicId: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface MyGroupItem extends Group {
  myRole: 'OWNER' | 'MODERATOR' | 'MEMBER';
  myStatus: 'ACTIVE' | 'PENDING' | 'BLOCKED';
  members: GroupMemberListItem[];
}

export interface PublicGroupItem extends Group {
  members: GroupMemberListItem[];
}

export type MutateGroupMemberResult =
  | { type: 'mutated'; membership: GroupMembership }
  | { type: 'removed' }
  | { type: 'not_found' }
  | { type: 'forbidden' }
  | { type: 'not_pending' };

export type LeaveGroupResult = { type: 'left' } | { type: 'deleted' } | { type: 'not_found' };

export abstract class GroupsRepository {
  abstract listPublic(query: ListPublicGroupsQuery): Promise<Group[]>;
  abstract listMine(userId: number): Promise<MyGroupItem[]>;
  abstract getPublic(groupPublicId: string): Promise<PublicGroupItem | null>;
  abstract create(data: CreateGroupData): Promise<Group>;
  abstract join(data: {
    userId: number;
    groupPublicId?: string;
    name?: string;
    password?: string;
  }): Promise<JoinGroupResult>;
  abstract acceptMember(data: {
    leaderId: number;
    groupPublicId: string;
    memberUsername: string;
  }): Promise<AcceptGroupMemberResult>;
  abstract inviteMember(data: {
    leaderId: number;
    groupPublicId: string;
    memberUsername: string;
  }): Promise<MutateGroupMemberResult>;
  abstract removeMember(data: {
    leaderId: number;
    groupPublicId: string;
    memberUsername: string;
  }): Promise<MutateGroupMemberResult>;
  abstract leave(data: { userId: number; groupPublicId: string }): Promise<LeaveGroupResult>;
}
