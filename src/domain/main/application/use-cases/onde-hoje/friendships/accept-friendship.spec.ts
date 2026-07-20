import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { AcceptFriendshipUseCase } from './accept-friendship';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeFriendship } from '@test/factories/make-friendship';
import { makeUser } from '@test/factories/make-user';
import { InMemoryFriendshipsRepository } from '@test/repositories/in-memory-friendships-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let friendshipsRepository: InMemoryFriendshipsRepository;
let fakeEventBus: FakeEventBus;
let sut: AcceptFriendshipUseCase;

/** A pending requester → addressee request, both users seeded. */
function setUpPendingRequest() {
  const requester = makeUser();
  const addressee = makeUser();
  usersRepository.items.push(requester, addressee);

  const friendship = makeFriendship({
    requesterId: new UniqueEntityID(requester.publicId),
    addresseeId: new UniqueEntityID(addressee.publicId),
    status: 'PENDING',
  });
  friendshipsRepository.items.push(friendship);

  return { requester, addressee };
}

describe('Accept Friendship', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    friendshipsRepository = new InMemoryFriendshipsRepository(usersRepository);
    fakeEventBus = new FakeEventBus();
    sut = new AcceptFriendshipUseCase(friendshipsRepository, usersRepository, fakeEventBus);
  });

  it('lets the addressee accept a pending request', async () => {
    const { requester, addressee } = setUpPendingRequest();

    const result = await sut.execute({
      currentUserPublicId: addressee.publicId,
      requesterUsername: requester.username,
    });

    expect(result.isSuccess()).toBe(true);
    expect((result as { value: { status: string } }).value.status).toBe('ACCEPTED');
    expect(friendshipsRepository.items[0].status).toBe('ACCEPTED');
    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'onde-hoje.friendship.accepted' }));
  });

  it('does not let the requester accept their own request', async () => {
    const { requester } = setUpPendingRequest();

    const result = await sut.execute({
      currentUserPublicId: requester.publicId,
      requesterUsername: requester.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('does not accept a request that is not pending', async () => {
    const { requester, addressee } = setUpPendingRequest();
    friendshipsRepository.items[0].accept();

    const result = await sut.execute({
      currentUserPublicId: addressee.publicId,
      requesterUsername: requester.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('fails when there is no request between the two', async () => {
    const addressee = makeUser();
    const requester = makeUser();
    usersRepository.items.push(addressee, requester);

    const result = await sut.execute({
      currentUserPublicId: addressee.publicId,
      requesterUsername: requester.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('fails for an unknown authenticated user', async () => {
    const { requester } = setUpPendingRequest();

    const result = await sut.execute({
      currentUserPublicId: 'non-existing-public-id',
      requesterUsername: requester.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('fails for an unknown requester', async () => {
    const addressee = makeUser();
    usersRepository.items.push(addressee);

    const result = await sut.execute({
      currentUserPublicId: addressee.publicId,
      requesterUsername: 'ghost',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
