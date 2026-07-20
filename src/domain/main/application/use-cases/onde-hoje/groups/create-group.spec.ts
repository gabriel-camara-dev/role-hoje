import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { CreateGroupUseCase } from './create-group';
import { FakePasswordHasher } from '@test/cryptography/fake-password-hasher';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeUser } from '@test/factories/make-user';
import { InMemoryGroupMembersRepository } from '@test/repositories/in-memory-group-members-repository';
import { InMemoryGroupsRepository } from '@test/repositories/in-memory-groups-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';
import { InMemoryTransactionRepository } from '@test/repositories/in-memory-transaction-repository';

let inMemoryUsersRepository: InMemoryOndeHojeUsersRepository;
let inMemoryGroupsRepository: InMemoryGroupsRepository;
let inMemoryGroupMembersRepository: InMemoryGroupMembersRepository;
let fakeEventBus: FakeEventBus;
let sut: CreateGroupUseCase;

describe('Create Group', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryOndeHojeUsersRepository();
    inMemoryGroupMembersRepository = new InMemoryGroupMembersRepository();
    inMemoryGroupsRepository = new InMemoryGroupsRepository(inMemoryGroupMembersRepository, inMemoryUsersRepository);
    fakeEventBus = new FakeEventBus();
    sut = new CreateGroupUseCase(
      inMemoryGroupsRepository,
      inMemoryGroupMembersRepository,
      inMemoryUsersRepository,
      new FakePasswordHasher(),
      fakeEventBus,
      new InMemoryTransactionRepository(),
    );
  });

  it('should create a group and enrol its creator as the active owner', async () => {
    const creator = makeUser();
    inMemoryUsersRepository.items.push(creator);

    const result = await sut.execute({
      currentUserPublicId: creator.publicId,
      name: 'Rolê de Sexta',
      privacy: 'PUBLIC',
    });

    expect(result.isSuccess()).toBe(true);
    expect(inMemoryGroupsRepository.items).toHaveLength(1);

    const [membership] = inMemoryGroupMembersRepository.items;

    expect(membership.groupId.toString()).toBe(inMemoryGroupsRepository.items[0].id.toString());
    expect(membership.memberId.toString()).toBe(creator.publicId);
    expect(membership.role).toBe('OWNER');
    expect(membership.status).toBe('ACTIVE');
  });

  it('should point the group ownership at its creator', async () => {
    const creator = makeUser();
    inMemoryUsersRepository.items.push(creator);

    await sut.execute({ currentUserPublicId: creator.publicId, name: 'Rolê', privacy: 'PUBLIC' });

    expect(inMemoryGroupsRepository.items[0].ownerId.toString()).toBe(creator.publicId);
  });

  it('should publish a domain event for the new group', async () => {
    const creator = makeUser();
    inMemoryUsersRepository.items.push(creator);

    await sut.execute({ currentUserPublicId: creator.publicId, name: 'Rolê', privacy: 'PUBLIC' });

    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'onde-hoje.group.created' }));
  });

  it('should hash the password of a private group', async () => {
    const creator = makeUser();
    inMemoryUsersRepository.items.push(creator);

    await sut.execute({
      currentUserPublicId: creator.publicId,
      name: 'Rolê Secreto',
      privacy: 'PRIVATE',
      password: 'segredo',
    });

    expect(inMemoryGroupsRepository.items[0].passwordHash).toBe('segredo-hashed');
  });

  it('should not store a password on a public group even when one is given', async () => {
    const creator = makeUser();
    inMemoryUsersRepository.items.push(creator);

    await sut.execute({
      currentUserPublicId: creator.publicId,
      name: 'Rolê Aberto',
      privacy: 'PUBLIC',
      password: 'segredo',
    });

    expect(inMemoryGroupsRepository.items[0].passwordHash).toBeNull();
  });

  it('should leave a private group without a password when none is given', async () => {
    const creator = makeUser();
    inMemoryUsersRepository.items.push(creator);

    await sut.execute({ currentUserPublicId: creator.publicId, name: 'Rolê Fechado', privacy: 'PRIVATE' });

    expect(inMemoryGroupsRepository.items[0].passwordHash).toBeNull();
  });

  it('should not create a group as an unknown user', async () => {
    const result = await sut.execute({
      currentUserPublicId: 'non-existing-public-id',
      name: 'Rolê Fantasma',
      privacy: 'PUBLIC',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
    expect(inMemoryGroupsRepository.items).toHaveLength(0);
    expect(inMemoryGroupMembersRepository.items).toHaveLength(0);
  });
});
