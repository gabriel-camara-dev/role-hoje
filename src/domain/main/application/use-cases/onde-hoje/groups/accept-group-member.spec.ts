import { ConflictError } from '../../errors/conflict-error';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { AcceptGroupMemberUseCase } from './accept-group-member';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { addMember, makeGroupWithOwner, makeOutsider } from '@test/factories/make-group-scenario';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let repositories: {
  usersRepository: InMemoryOndeHojeUsersRepository;
  groupsRepository: InMemoryGroupsRepository;
  groupMembersRepository: InMemoryGroupMembersRepository;
};
let fakeEventBus: FakeEventBus;
let sut: AcceptGroupMemberUseCase;

describe('Accept Group Member', () => {
  beforeEach(() => {
    const usersRepository = new InMemoryOndeHojeUsersRepository();
    const groupMembersRepository = new InMemoryGroupMembersRepository();
    const groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);

    repositories = { usersRepository, groupsRepository, groupMembersRepository };
    fakeEventBus = new FakeEventBus();

    // The notification is the OnGroupMemberAccepted subscriber's job, covered in
    // its own spec; here we only assert the use case's own outcome + event.
    sut = new AcceptGroupMemberUseCase(groupsRepository, groupMembersRepository, usersRepository, fakeEventBus);
  });

  function setUpPendingRequest() {
    const { owner, group } = makeGroupWithOwner(repositories);
    const candidate = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: candidate, status: 'PENDING' });

    return { owner, group, candidate };
  }

  it('should let the owner accept a pending member', async () => {
    const { owner, group, candidate } = setUpPendingRequest();

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: candidate.username,
    });

    expect(result.isSuccess()).toBe(true);

    const membership = await repositories.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: candidate.publicId,
    });

    expect(membership?.status).toBe('ACTIVE');
  });

  it('should publish an integration event for the acceptance', async () => {
    const { owner, group, candidate } = setUpPendingRequest();

    await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: candidate.username,
    });

    expect(fakeEventBus.events).toContainEqual(
      expect.objectContaining({ eventName: 'onde-hoje.group.member-accepted' }),
    );
  });

  it('should not let a plain member accept a pending request', async () => {
    const { group, candidate } = setUpPendingRequest();
    const plainMember = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: plainMember, status: 'ACTIVE' });

    const result = await sut.execute({
      currentUserPublicId: plainMember.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: candidate.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });

  it('should not let an owner who is no longer active accept members', async () => {
    const { owner, group, candidate } = setUpPendingRequest();
    const ownership = await repositories.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: owner.publicId,
    });
    ownership?.requestToJoin();

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: candidate.username,
    });

    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });

  it('should not accept a member whose request is not pending', async () => {
    const { owner, group, candidate } = setUpPendingRequest();
    const membership = await repositories.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: candidate.publicId,
    });
    membership?.activate();

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: candidate.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ConflictError);
  });

  it('should not accept a user who never asked to join', async () => {
    const { owner, group } = setUpPendingRequest();
    const stranger = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: group.id.toString(),
      memberUsername: stranger.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should not accept a member of a group that does not exist', async () => {
    const { owner, candidate } = setUpPendingRequest();

    const result = await sut.execute({
      currentUserPublicId: owner.publicId,
      groupPublicId: 'non-existing-public-id',
      memberUsername: candidate.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
