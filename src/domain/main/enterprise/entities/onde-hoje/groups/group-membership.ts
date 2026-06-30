export type GroupMemberStatus = 'ACTIVE' | 'PENDING' | 'BLOCKED';

export interface GroupMembership {
  groupPublicId: string;
  status: GroupMemberStatus;
}

