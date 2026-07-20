import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { GroupPrivacy } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import type { GroupMemberStatus } from '@/domain/main/enterprise/entities/onde-hoje/groups/group-membership';
import type { User } from '@/domain/main/enterprise/entities/user';
import type { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import type { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import type { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';
import { makeGroup } from './make-group';
import { makeGroupMember } from './make-group-member';
import { makeUser } from './make-user';

interface Repositories {
  usersRepository: InMemoryOndeHojeUsersRepository;
  groupsRepository: InMemoryGroupsRepository;
  groupMembersRepository: InMemoryGroupMembersRepository;
}

/**
 * Sets up the shape every group spec starts from: a group that already has its
 * owner, since a group without one is not a state the app can reach.
 */
export function makeGroupWithOwner(
  repositories: Repositories,
  groupProps: { privacy?: GroupPrivacy; passwordHash?: string | null; name?: string } = {},
) {
  const owner = makeUser();
  repositories.usersRepository.items.push(owner);

  const group = makeGroup({ ...groupProps, ownerId: new UniqueEntityID(owner.publicId) });
  repositories.groupsRepository.items.push(group);
  repositories.groupMembersRepository.items.push(
    makeGroupMember({
      groupId: group.id,
      memberId: new UniqueEntityID(owner.publicId),
      role: 'OWNER',
      status: 'ACTIVE',
    }),
  );

  return { owner, group };
}

/** Adds an existing user to a group with the given standing. */
export function addMember(
  repositories: Repositories,
  data: { groupId: UniqueEntityID; user: User; status: GroupMemberStatus },
) {
  const membership = makeGroupMember({
    groupId: data.groupId,
    memberId: new UniqueEntityID(data.user.publicId),
    status: data.status,
  });

  repositories.groupMembersRepository.items.push(membership);

  return membership;
}

/** A user that exists but belongs to no group. */
export function makeOutsider(repositories: Repositories) {
  const user = makeUser();
  repositories.usersRepository.items.push(user);

  return user;
}
