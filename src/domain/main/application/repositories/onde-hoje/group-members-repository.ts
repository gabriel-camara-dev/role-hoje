import type { GroupMember } from '../../../enterprise/entities/onde-hoje/groups/group-member';

export abstract class GroupMembersRepository {
  abstract findByGroupAndMember(data: { groupId: string; memberId: string }): Promise<GroupMember | null>;
  abstract findOwnerByGroupId(groupId: string): Promise<GroupMember | null>;
  /** Oldest active member other than `exceptMemberId` — the successor when an owner leaves. */
  abstract findSuccessor(data: { groupId: string; exceptMemberId: string }): Promise<GroupMember | null>;
  abstract create(groupMember: GroupMember): Promise<void>;
  abstract save(groupMember: GroupMember): Promise<void>;
  abstract delete(groupMember: GroupMember): Promise<void>;
}
