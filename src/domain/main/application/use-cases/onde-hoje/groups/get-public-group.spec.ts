import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { GetPublicGroupUseCase } from './get-public-group';
import { addMember, makeGroupWithOwner, makeOutsider } from '@test/factories/make-group-scenario';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let repositories: {
  usersRepository: InMemoryOndeHojeUsersRepository;
  groupsRepository: InMemoryGroupsRepository;
  groupMembersRepository: InMemoryGroupMembersRepository;
};
let sut: GetPublicGroupUseCase;

function groupOf(result: unknown) {
  return (
    result as {
      value: {
        group: {
          members: Array<{ memberId: { toString(): string }; role: string; status: string; username: string }>;
          membersCount: number;
          todayVotesCount: number;
        };
      };
    }
  ).value.group;
}

describe('Get Public Group', () => {
  beforeEach(() => {
    const usersRepository = new InMemoryOndeHojeUsersRepository();
    const groupMembersRepository = new InMemoryGroupMembersRepository();
    const groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);

    repositories = { usersRepository, groupsRepository, groupMembersRepository };
    sut = new GetPublicGroupUseCase(groupsRepository);
  });

  it('should return the group with its active members', async () => {
    const { owner, group } = makeGroupWithOwner(repositories, { privacy: 'PUBLIC' });

    const result = await sut.execute({ groupPublicId: group.id.toString() });

    expect(result.isSuccess()).toBe(true);

    const { members } = groupOf(result);

    expect(members).toHaveLength(1);
    expect(members[0].memberId.toString()).toBe(owner.publicId);
    expect(members[0].username).toBe(owner.username);
    expect(members[0].role).toBe('OWNER');
  });

  it('should hide members who are not active yet', async () => {
    const { owner, group } = makeGroupWithOwner(repositories, { privacy: 'PUBLIC' });
    const pending = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: pending, status: 'PENDING' });

    const { members } = groupOf(await sut.execute({ groupPublicId: group.id.toString() }));

    expect(members).toHaveLength(1);
    expect(members[0].memberId.toString()).toBe(owner.publicId);
  });

  it('should carry the member and today’s vote counts', async () => {
    const { group } = makeGroupWithOwner(repositories, { privacy: 'PUBLIC' });
    repositories.groupsRepository.todayVotes.push(group.id.toString());

    const details = groupOf(await sut.execute({ groupPublicId: group.id.toString() }));

    expect(details.membersCount).toBe(1);
    expect(details.todayVotesCount).toBe(1);
  });

  it('should not expose a private group', async () => {
    const { group } = makeGroupWithOwner(repositories, { privacy: 'PRIVATE' });

    const result = await sut.execute({ groupPublicId: group.id.toString() });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should fail for a group that does not exist', async () => {
    const result = await sut.execute({ groupPublicId: 'non-existing-public-id' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
