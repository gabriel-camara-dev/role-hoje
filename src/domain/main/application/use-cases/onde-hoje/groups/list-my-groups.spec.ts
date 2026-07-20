import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { ListMyGroupsUseCase } from './list-my-groups';
import { addMember, makeGroupWithOwner, makeOutsider } from '@test/factories/make-group-scenario';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let repositories: {
  usersRepository: InMemoryOndeHojeUsersRepository;
  groupsRepository: InMemoryGroupsRepository;
  groupMembersRepository: InMemoryGroupMembersRepository;
};
let sut: ListMyGroupsUseCase;

function groupsOf(result: unknown) {
  return (
    result as {
      value: {
        groups: Array<{
          group: { groupId: { toString(): string }; members: unknown[]; membersCount: number };
          myRole: string;
          myStatus: string;
        }>;
      };
    }
  ).value.groups;
}

describe('List My Groups', () => {
  beforeEach(() => {
    const usersRepository = new InMemoryOndeHojeUsersRepository();
    const groupMembersRepository = new InMemoryGroupMembersRepository();
    const groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);

    repositories = { usersRepository, groupsRepository, groupMembersRepository };
    sut = new ListMyGroupsUseCase(groupsRepository, usersRepository);
  });

  it('should list the groups the user belongs to, with their own standing', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);

    const listed = groupsOf(await sut.execute({ currentUserPublicId: owner.publicId }));

    expect(listed).toHaveLength(1);
    expect(listed[0].group.groupId.toString()).toBe(group.id.toString());
    expect(listed[0].myRole).toBe('OWNER');
    expect(listed[0].myStatus).toBe('ACTIVE');
  });

  it('should include groups where the user is still pending', async () => {
    const { group } = makeGroupWithOwner(repositories);
    const candidate = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: candidate, status: 'PENDING' });

    const listed = groupsOf(await sut.execute({ currentUserPublicId: candidate.publicId }));

    expect(listed).toHaveLength(1);
    expect(listed[0].myRole).toBe('MEMBER');
    expect(listed[0].myStatus).toBe('PENDING');
  });

  it('should not list a group the user has no membership in', async () => {
    makeGroupWithOwner(repositories);
    const stranger = makeOutsider(repositories);

    expect(groupsOf(await sut.execute({ currentUserPublicId: stranger.publicId }))).toEqual([]);
  });

  it('should carry every member of the group, not just the requester', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);
    const pending = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: pending, status: 'PENDING' });

    const [listed] = groupsOf(await sut.execute({ currentUserPublicId: owner.publicId }));

    expect(listed.group.members).toHaveLength(2);
    // Only the active one counts towards membersCount.
    expect(listed.group.membersCount).toBe(1);
  });

  it('should keep each group’s members separate', async () => {
    const { owner, group: first } = makeGroupWithOwner(repositories);
    const mate = makeOutsider(repositories);
    addMember(repositories, { groupId: first.id, user: mate, status: 'ACTIVE' });

    const { group: second } = makeGroupWithOwner(repositories);
    addMember(repositories, { groupId: second.id, user: owner, status: 'ACTIVE' });

    const listed = groupsOf(await sut.execute({ currentUserPublicId: owner.publicId }));

    const firstListed = listed.find((item) => item.group.groupId.toString() === first.id.toString());
    const secondListed = listed.find((item) => item.group.groupId.toString() === second.id.toString());

    expect(firstListed?.group.members).toHaveLength(2);
    // The second group has its own owner plus the requester.
    expect(secondListed?.group.members).toHaveLength(2);
  });

  it('should not list groups as an unknown user', async () => {
    const result = await sut.execute({ currentUserPublicId: 'non-existing-public-id' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
