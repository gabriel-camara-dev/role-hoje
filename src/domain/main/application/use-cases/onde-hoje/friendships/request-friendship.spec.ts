import { ConflictError } from '../../errors/conflict-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { RequestFriendshipUseCase } from './request-friendship';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeFriendship } from '@test/factories/make-friendship';
import { makeUser } from '@test/factories/make-user';
import { InMemoryFriendshipsRepository } from '@test/repositories/in-memory-friendships-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';

let inMemoryUsersRepository: InMemoryOndeHojeUsersRepository;
let inMemoryFriendshipsRepository: InMemoryFriendshipsRepository;
let fakeEventBus: FakeEventBus;
let sut: RequestFriendshipUseCase;

describe('Request Friendship', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryOndeHojeUsersRepository();
    inMemoryFriendshipsRepository = new InMemoryFriendshipsRepository(inMemoryUsersRepository);
    fakeEventBus = new FakeEventBus();

    // Notifying the addressee is the OnFriendshipRequested subscriber's job (its own spec).
    sut = new RequestFriendshipUseCase(inMemoryFriendshipsRepository, inMemoryUsersRepository, fakeEventBus);
  });

  it('should be able to request a friendship', async () => {
    const requester = makeUser();
    const addressee = makeUser();
    inMemoryUsersRepository.items.push(requester, addressee);

    const result = await sut.execute({
      currentUserPublicId: requester.publicId,
      addresseeUsername: addressee.username,
    });

    expect(result.isSuccess()).toBe(true);
    expect(inMemoryFriendshipsRepository.items).toHaveLength(1);

    const [friendship] = inMemoryFriendshipsRepository.items;

    expect(friendship.requesterId.toString()).toBe(requester.publicId);
    expect(friendship.addresseeId.toString()).toBe(addressee.publicId);
    expect(friendship.status).toBe('PENDING');
  });

  it('should publish an integration event for the request', async () => {
    const requester = makeUser();
    const addressee = makeUser();
    inMemoryUsersRepository.items.push(requester, addressee);

    await sut.execute({
      currentUserPublicId: requester.publicId,
      addresseeUsername: addressee.username,
    });

    expect(fakeEventBus.events).toContainEqual(
      expect.objectContaining({ eventName: 'onde-hoje.friendship.requested' }),
    );
  });

  it('should not be able to request a friendship as an unknown user', async () => {
    const addressee = makeUser();
    inMemoryUsersRepository.items.push(addressee);

    const result = await sut.execute({
      currentUserPublicId: 'non-existing-public-id',
      addresseeUsername: addressee.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should not be able to request a friendship with a non-existing user', async () => {
    const requester = makeUser();
    inMemoryUsersRepository.items.push(requester);

    const result = await sut.execute({
      currentUserPublicId: requester.publicId,
      addresseeUsername: 'ghost',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should not be able to request a friendship that is already accepted', async () => {
    const requester = makeUser();
    const addressee = makeUser();
    inMemoryUsersRepository.items.push(requester, addressee);
    inMemoryFriendshipsRepository.items.push(
      makeFriendship({
        requesterId: new UniqueEntityID(requester.publicId),
        addresseeId: new UniqueEntityID(addressee.publicId),
        status: 'ACCEPTED',
      }),
    );

    const result = await sut.execute({
      currentUserPublicId: requester.publicId,
      addresseeUsername: addressee.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ConflictError);
  });
});
