export type GroupMemberStatus = 'ACTIVE' | 'PENDING' | 'INVITED' | 'BLOCKED';

export interface GroupMembership {
  groupPublicId: string;
  status: GroupMemberStatus;
}
