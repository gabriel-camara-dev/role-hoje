import { ConflictError } from '../../errors/conflict-error';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { InviteGroupMemberUseCase } from './invite-group-member';
import { addMember, makeGroupWithOwner, makeOutsider } from '@test/factories/make-group-scenario';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let repositories: {
  usersRepository: InMemoryOndeHojeUsersRepository;
  groupsRepository: InMemoryGroupsRepository;
  groupMembersRepository: InMemoryGroupMembersRepository;
};
let sut: InviteGroupMemberUseCase;

describe('Invite Group Member', () => {
  beforeEach(() => {
    const usersRepository = new InMemoryOndeHojeUsersRepository();
    const groupMembersRepository = new InMemoryGroupMembersRepository();
    const groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);

    repositories = { usersRepository, groupsRepository, groupMembersRepository };

    // Notifying the invitee is the OnGroupMemberInvited subscriber's job (its own spec).
    sut = new InviteGroupMemberUseCase(groupsRepository, groupMembersRepository, usersRepository);
  });

  it('should let any active member invite someone, leaving the invite pending acceptance', async () => {
    const { group } = makeGroupWithOwner(repositories);
    const member = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: member, status: 'ACTIVE' });
    const invitee = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: member.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: invitee.username,
    });

    expect(result.isSuccess()).toBe(true);
    expect((result as { value: { membership: { status: string } } }).value.membership.status).toBe('INVITED');
  });

  it('should not let someone outside the group invite', async () => {
    const { group } = makeGroupWithOwner(repositories);
    const stranger = makeOutsider(repositories);
    const invitee = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: stranger.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: invitee.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });

  it('should not let a member whose own request is still pending invite others', async () => {
    const { group } = makeGroupWithOwner(repositories);
    const pending = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: pending, status: 'PENDING' });
    const invitee = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: pending.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: invitee.username,
    });

    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });

  it('should not invite someone who is already an active member', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);
    const member = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: member, status: 'ACTIVE' });

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: member.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ConflictError);
  });

  it('should not invite a blocked user back into the group', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);
    const blocked = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: blocked, status: 'BLOCKED' });

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: blocked.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });

  it('should reuse the membership of someone who had asked to join', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);
    const candidate = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: candidate, status: 'PENDING' });

    await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: candidate.username,
    });

    const theirs = repositories.groupMembersRepository.items.filter(
      (item) => item.memberId.toString() === candidate.publicId,
    );

    expect(theirs).toHaveLength(1);
    expect(theirs[0].status).toBe('INVITED');
  });

  it('should not invite a user that does not exist', async () => {
    const { owner, group } = makeGroupWithOwner(repositories);

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: 'ghost',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
