import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { RemoveGroupMemberUseCase } from './remove-group-member';
import { addMember, makeGroupWithOwner, makeOutsider } from '@test/factories/make-group-scenario';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let repositories: {
  usersRepository: InMemoryOndeHojeUsersRepository;
  groupsRepository: InMemoryGroupsRepository;
  groupMembersRepository: InMemoryGroupMembersRepository;
};
let sut: RemoveGroupMemberUseCase;

describe('Remove Group Member', () => {
  beforeEach(() => {
    const usersRepository = new InMemoryOndeHojeUsersRepository();
    const groupMembersRepository = new InMemoryGroupMembersRepository();
    const groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);

    repositories = { usersRepository, groupsRepository, groupMembersRepository };
    sut = new RemoveGroupMemberUseCase(groupsRepository, groupMembersRepository, usersRepository);
  });

  function setUpGroupWithMember() {
    const { owner, group } = makeGroupWithOwner(repositories);
    const member = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: member, status: 'ACTIVE' });

    return { owner, group, member };
  }

  it('should let the owner remove a member', async () => {
    const { owner, group, member } = setUpGroupWithMember();

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: member.username,
    });

    expect(result.isSuccess()).toBe(true);
    expect(
      await repositories.groupMembersRepository.findByGroupAndMember({
        groupId: group.id.toString(),
        memberId: member.publicId,
      }),
    ).toBeNull();
    expect(repositories.groupMembersRepository.items).toHaveLength(1);
  });

  it('should not let the owner remove themselves', async () => {
    const { owner, group } = setUpGroupWithMember();

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: owner.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
    expect(
      await repositories.groupMembersRepository.findByGroupAndMember({
        groupId: group.id.toString(),
        memberId: owner.publicId,
      }),
    ).not.toBeNull();
  });

  it('should not let a plain member remove anyone', async () => {
    const { owner, group, member } = setUpGroupWithMember();

    const result = await sut.execute({
      currentUserPublicId: member.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: owner.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });

  it('should not remove a user who is not in the group', async () => {
    const { owner, group } = setUpGroupWithMember();
    const stranger = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: stranger.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should not remove a member from a group that does not exist', async () => {
    const { owner, member } = setUpGroupWithMember();

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: 'non-existing-public-id',
      memberUsername: member.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
