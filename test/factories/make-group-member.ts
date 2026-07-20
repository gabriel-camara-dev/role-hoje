import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { GroupMember, type GroupMemberProps } from '@/domain/main/enterprise/entities/onde-hoje/groups/group-member';

export function makeGroupMember(override: Partial<GroupMemberProps> = {}, id?: UniqueEntityID) {
  return GroupMember.create(
    {
      groupId: new UniqueEntityID(),
      memberId: new UniqueEntityID(),
      role: 'MEMBER',
      status: 'ACTIVE',
      ...override,
    },
    id,
  );
}
