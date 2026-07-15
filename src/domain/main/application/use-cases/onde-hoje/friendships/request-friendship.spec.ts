import { ConflictError } from '../../errors/conflict-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';
import { RequestFriendshipUseCase } from './request-friendship';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeUser } from '@test/factories/make-user';
import { InMemoryFriendshipsRepository } from '@test/repositories/in-memory-friendships-repository';
import { InMemoryNotificationsRepository } from '@test/repositories/in-memory-notifications-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let inMemoryUsersRepository: InMemoryOndeHojeUsersRepository;
let inMemoryFriendshipsRepository: InMemoryFriendshipsRepository;
let inMemoryNotificationsRepository: InMemoryNotificationsRepository;
let fakeEventBus: FakeEventBus;
let notificationDispatcher: NotificationDispatcher;
let sut: RequestFriendshipUseCase;

describe('Request Friendship', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryOndeHojeUsersRepository();
    inMemoryFriendshipsRepository = new InMemoryFriendshipsRepository(inMemoryUsersRepository);
    inMemoryNotificationsRepository = new InMemoryNotificationsRepository(inMemoryUsersRepository);
    fakeEventBus = new FakeEventBus();
    notificationDispatcher = new NotificationDispatcher(
      inMemoryNotificationsRepository,
      inMemoryUsersRepository,
      fakeEventBus,
    );
    sut = new RequestFriendshipUseCase(
      inMemoryFriendshipsRepository,
      inMemoryUsersRepository,
      fakeEventBus,
      notificationDispatcher,
    );
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
    expect(inMemoryFriendshipsRepository.items[0]).toMatchObject({
      requesterId: requester.id,
      addresseeId: addressee.id,
      status: 'PENDING',
    });
  });

  it('should notify the addressee and publish a domain event', async () => {
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
    expect(inMemoryNotificationsRepository.items).toEqual([
      expect.objectContaining({ recipientId: addressee.id, type: 'FRIEND_REQUEST' }),
    ]);
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
    inMemoryFriendshipsRepository.items.push({
      requesterId: requester.id,
      addresseeId: addressee.id,
      status: 'ACCEPTED',
    });

    const result = await sut.execute({
      currentUserPublicId: requester.publicId,
      addresseeUsername: addressee.username,
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ConflictError);
  });
});
