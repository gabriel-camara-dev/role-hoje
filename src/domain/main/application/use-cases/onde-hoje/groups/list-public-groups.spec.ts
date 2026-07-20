import { ListPublicGroupsUseCase } from './list-public-groups';
import { makeGroup } from '@test/factories/make-group';
import { addMember, makeGroupWithOwner, makeOutsider } from '@test/factories/make-group-scenario';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let repositories: {
  usersRepository: InMemoryOndeHojeUsersRepository;
  groupsRepository: InMemoryGroupsRepository;
  groupMembersRepository: InMemoryGroupMembersRepository;
};
let sut: ListPublicGroupsUseCase;

function groupsOf(result: unknown) {
  return (
    result as {
      value: { groups: Array<{ groupId: { toString(): string }; membersCount: number; todayVotesCount: number }> };
    }
  ).value.groups;
}

describe('List Public Groups', () => {
  beforeEach(() => {
    const usersRepository = new InMemoryOndeHojeUsersRepository();
    const groupMembersRepository = new InMemoryGroupMembersRepository();
    const groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);

    repositories = { usersRepository, groupsRepository, groupMembersRepository };
    sut = new ListPublicGroupsUseCase(groupsRepository);
  });

  it('should list only public groups', async () => {
    const publicGroup = makeGroup({ privacy: 'PUBLIC' });
    const privateGroup = makeGroup({ privacy: 'PRIVATE' });
    repositories.groupsRepository.items.push(publicGroup, privateGroup);

    const listed = groupsOf(await sut.execute({}));

    expect(listed).toHaveLength(1);
    expect(listed[0].groupId.toString()).toBe(publicGroup.id.toString());
  });

  it('should filter by city, ignoring case', async () => {
    const wanted = makeGroup({ privacy: 'PUBLIC', city: 'São Paulo' });
    const other = makeGroup({ privacy: 'PUBLIC', city: 'Rio de Janeiro' });
    repositories.groupsRepository.items.push(wanted, other);

    const listed = groupsOf(await sut.execute({ city: 'são paulo' }));

    expect(listed).toHaveLength(1);
    expect(listed[0].groupId.toString()).toBe(wanted.id.toString());
  });

  it('should count only active members and only today’s votes', async () => {
    const { group } = makeGroupWithOwner(repositories, { privacy: 'PUBLIC' });
    const pending = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: pending, status: 'PENDING' });
    repositories.groupsRepository.todayVotes.push(group.id.toString());

    const [listed] = groupsOf(await sut.execute({}));

    // Only the owner is active; the pending request does not count.
    expect(listed.membersCount).toBe(1);
    expect(listed.todayVotesCount).toBe(1);
  });

  it('should report zeroed counts for an empty group', async () => {
    repositories.groupsRepository.items.push(makeGroup({ privacy: 'PUBLIC' }));

    const [listed] = groupsOf(await sut.execute({}));

    expect(listed.membersCount).toBe(0);
    expect(listed.todayVotesCount).toBe(0);
  });

  it('should return an empty list when there is no public group', async () => {
    expect(groupsOf(await sut.execute({}))).toEqual([]);
  });
});
