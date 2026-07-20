import { ConflictError } from '../../errors/conflict-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { RespondGroupInviteUseCase } from './respond-group-invite';
import { addMember, makeGroupWithOwner, makeOutsider } from '@test/factories/make-group-scenario';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let repositories: {
  usersRepository: InMemoryOndeHojeUsersRepository;
  groupsRepository: InMemoryGroupsRepository;
  groupMembersRepository: InMemoryGroupMembersRepository;
};
let sut: RespondGroupInviteUseCase;

describe('Respond Group Invite', () => {
  beforeEach(() => {
    const usersRepository = new InMemoryOndeHojeUsersRepository();
    const groupMembersRepository = new InMemoryGroupMembersRepository();
    const groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);

    repositories = { usersRepository, groupsRepository, groupMembersRepository };

    // Notifying the owner on accept is the OnGroupInviteAccepted subscriber's job.
    sut = new RespondGroupInviteUseCase(groupsRepository, groupMembersRepository, usersRepository);
  });

  function setUpInvite() {
    const { owner, group } = makeGroupWithOwner(repositories);
    const invitee = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: invitee, status: 'INVITED' });

    return { owner, group, invitee };
  }

  it('should turn the invite into an active membership on accept', async () => {
    const { group, invitee } = setUpInvite();

    const result = await sut.execute({
      currentUserPublicId: invitee.publicId,
      groupPublicId: group.id.toString(),
      action: 'accept',
    });

    expect(result.isSuccess()).toBe(true);
    expect((result as { value: { membership: { status: string } } }).value.membership.status).toBe('ACTIVE');
  });

  it('should drop the membership on decline', async () => {
    const { group, invitee } = setUpInvite();

    const result = await sut.execute({
      currentUserPublicId: invitee.publicId,
      groupPublicId: group.id.toString(),
      action: 'decline',
    });

    expect(result.isSuccess()).toBe(true);
    expect((result as { value: { membership: unknown } }).value.membership).toBeNull();
    expect(
      await repositories.groupMembersRepository.findByGroupAndMember({
        groupId: group.id.toString(),
        memberId: invitee.publicId,
      }),
    ).toBeNull();
  });

  it('should not respond to an invite that was never sent', async () => {
    const { group } = setUpInvite();
    const stranger = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: stranger.publicId,
      groupPublicId: group.id.toString(),
      action: 'accept',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ConflictError);
  });

  it('should not let an already active member re-accept an invite', async () => {
    const { group, invitee } = setUpInvite();
    const membership = await repositories.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: invitee.publicId,
    });
    membership?.activate();

    const result = await sut.execute({
      currentUserPublicId: invitee.publicId,
      groupPublicId: group.id.toString(),
      action: 'accept',
    });

    expect((result as { value: unknown }).value).toBeInstanceOf(ConflictError);
  });

  it('should not respond to an invite for a group that does not exist', async () => {
    const { invitee } = setUpInvite();

    const result = await sut.execute({
      currentUserPublicId: invitee.publicId,
      groupPublicId: 'non-existing-public-id',
      action: 'accept',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
