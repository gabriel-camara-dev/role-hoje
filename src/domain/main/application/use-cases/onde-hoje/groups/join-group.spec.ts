import { ConflictError } from '../../errors/conflict-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { JoinGroupUseCase } from './join-group';
import { FakePasswordHasher } from '@test/cryptography/fake-password-hasher';
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
let sut: JoinGroupUseCase;

function statusOf(result: unknown) {
  return (result as { value: { membership: { status: string } } }).value.membership.status;
}

describe('Join Group', () => {
  beforeEach(() => {
    const usersRepository = new InMemoryOndeHojeUsersRepository();
    const groupMembersRepository = new InMemoryGroupMembersRepository();
    const groupsRepository = new InMemoryGroupsRepository(groupMembersRepository, usersRepository);

    repositories = { usersRepository, groupsRepository, groupMembersRepository };
    fakeEventBus = new FakeEventBus();

    // Notifying the owner of a pending request is the OnGroupJoinRequested subscriber's job.
    sut = new JoinGroupUseCase(
      groupsRepository,
      groupMembersRepository,
      usersRepository,
      new FakePasswordHasher(),
      fakeEventBus,
    );
  });

  it('should join a public group as an active member right away', async () => {
    const { group } = makeGroupWithOwner(repositories, { privacy: 'PUBLIC' });
    const joiner = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: joiner.publicId,
      groupPublicId: group.id.toString(),
    });

    expect(result.isSuccess()).toBe(true);
    expect(statusOf(result)).toBe('ACTIVE');
    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'onde-hoje.group.member-joined' }));
  });

  it('should join a private group as an active member when the password matches', async () => {
    const { group } = makeGroupWithOwner(repositories, { privacy: 'PRIVATE', passwordHash: 'segredo-hashed' });
    const joiner = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: joiner.publicId,
      groupPublicId: group.id.toString(),
      password: 'segredo',
    });

    expect(statusOf(result)).toBe('ACTIVE');
  });

  it('should fall back to a pending request when the private group password is wrong', async () => {
    const { group } = makeGroupWithOwner(repositories, { privacy: 'PRIVATE', passwordHash: 'segredo-hashed' });
    const joiner = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: joiner.publicId,
      groupPublicId: group.id.toString(),
      password: 'chute-errado',
    });

    expect(statusOf(result)).toBe('PENDING');
  });

  it('should fall back to a pending request when a private group is joined with no password', async () => {
    const { group } = makeGroupWithOwner(repositories, { privacy: 'PRIVATE', passwordHash: 'segredo-hashed' });
    const joiner = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: joiner.publicId,
      groupPublicId: group.id.toString(),
    });

    expect(statusOf(result)).toBe('PENDING');
  });

  it('should be able to join a group by name', async () => {
    makeGroupWithOwner(repositories, { privacy: 'PUBLIC', name: 'Rolê de Sexta' });
    const joiner = makeOutsider(repositories);

    const result = await sut.execute({ currentUserPublicId: joiner.publicId, name: 'rolê de sexta' });

    expect(result.isSuccess()).toBe(true);
  });

  it('should not let a blocked member rejoin', async () => {
    const { group } = makeGroupWithOwner(repositories, { privacy: 'PUBLIC' });
    const blocked = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: blocked, status: 'BLOCKED' });

    const result = await sut.execute({
      currentUserPublicId: blocked.publicId,
      groupPublicId: group.id.toString(),
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ConflictError);
  });

  it('should reuse the existing membership instead of adding a second one', async () => {
    const { group } = makeGroupWithOwner(repositories, { privacy: 'PUBLIC' });
    const joiner = makeOutsider(repositories);
    addMember(repositories, { groupId: group.id, user: joiner, status: 'PENDING' });

    await sut.execute({ currentUserPublicId: joiner.publicId, groupPublicId: group.id.toString() });

    const theirs = repositories.groupMembersRepository.items.filter(
      (item) => item.memberId.toString() === joiner.publicId,
    );

    expect(theirs).toHaveLength(1);
    expect(theirs[0].status).toBe('ACTIVE');
  });

  it('should not be able to join a group that does not exist', async () => {
    const joiner = makeOutsider(repositories);

    const result = await sut.execute({
      currentUserPublicId: joiner.publicId,
      groupPublicId: 'non-existing-public-id',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
