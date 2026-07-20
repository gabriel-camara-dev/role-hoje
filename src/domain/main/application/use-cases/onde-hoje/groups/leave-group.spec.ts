import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { LeaveGroupUseCase } from './leave-group';
import { addMember, makeGroupWithOwner, makeOutsider } from '@test/factories/make-group-scenario';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';
import { InMemoryTransactionRepository } from '@test/repositories/in-memory-transaction-repository';

let repositories: {
  usersRepository: InMemoryOndeHojeUsersRepository;
  groupsRepository: InMemoryGroupsRepository;
  groupMembersRepository: InMemoryGroupMembersRepository;
};
let sut: LeaveGroupUseCase;

function groupDeleted(result: unknown) {
  return (result as { value: { groupDeleted: boolean } }).value.groupDeleted;
}

describe('Leave Group', () => {
  beforeEach(() => {
    const usersRepository = new InMemoryOndeHojeUsersRepository();
    const groupMembersRepository = new InMemoryGroupMembersRepository();
    const groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);

    repositories = { usersRepository, groupsRepository, groupMembersRepository };
    sut = new LeaveGroupUseCase(
      groupsRepository,
      groupMembersRepository,
      usersRepository,
      new InMemoryTransactionRepository(),
    );
  });

  it('should let a plain member leave without touching the group', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);
    const member = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: member, status: 'ACTIVE' });

    const result = await sut.execute({
      currentUserPublicId: member.publicId,
      groupPublicId: group.id.toString(),
    });

    expect(result.isSuccess()).toBe(true);
    expect(groupDeleted(result)).toBe(false);
    expect(repositories.groupsRepository.items).toHaveLength(1);
    expect(repositories.groupMembersRepository.items.map((item) => item.memberId.toString())).toEqual([owner.publicId]);
  });

  it('should hand the group over to the oldest active member when the owner leaves', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);
    const successor = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: successor, status: 'ACTIVE' });

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
    });

    expect(result.isSuccess()).toBe(true);
    expect(groupDeleted(result)).toBe(false);

    const [remaining] = repositories.groupMembersRepository.items;

    expect(repositories.groupMembersRepository.items).toHaveLength(1);
    expect(remaining.memberId.toString()).toBe(successor.publicId);
    expect(remaining.role).toBe('OWNER');
    // The denormalised column has to follow the membership.
    expect(repositories.groupsRepository.items[0].ownerId.toString()).toBe(successor.publicId);
  });

  it('should delete the group when the last member leaves', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
    });

    expect(result.isSuccess()).toBe(true);
    expect(groupDeleted(result)).toBe(true);
    expect(repositories.groupsRepository.items).toHaveLength(0);
  });

  it('should not hand the group over to a member who is only pending', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);
    const pending = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: pending, status: 'PENDING' });

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
    });

    expect(groupDeleted(result)).toBe(true);
    expect(repositories.groupsRepository.items).toHaveLength(0);
  });

  it('should not be able to leave a group the user is not an active member of', async () => {
    const { group } = makeGroupWithOwner(repositories);
    const stranger = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: stranger.publicId,
      groupPublicId: group.id.toString(),
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should not be able to leave a group that does not exist', async () => {
    const { owner } = makeGroupWithOwner(repositories);

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: 'non-existing-public-id',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
