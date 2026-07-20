import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { NotificationDispatcher } from '../../../use-cases/onde-hoje/notifications/notification-dispatcher';
import { SendNotificationUseCase } from '../../../use-cases/onde-hoje/notifications/send-notification';
import { OnFriendshipRequested } from './on-friendship-requested';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeFriendship } from '@test/factories/make-friendship';
import { makeUser } from '@test/factories/make-user';
import { InMemoryFriendshipsRepository } from '@test/repositories/in-memory-friendships-repository';
import { InMemoryNotificationsRepository } from '@test/repositories/in-memory-notifications-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';
import { waitFor } from '@test/utils/wait-for';

let usersRepository: InMemoryOndeHojeUsersRepository;
let friendshipsRepository: InMemoryFriendshipsRepository;
let notificationsRepository: InMemoryNotificationsRepository;

describe('On Friendship Requested', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    friendshipsRepository = new InMemoryFriendshipsRepository(usersRepository);
    notificationsRepository = new InMemoryNotificationsRepository();

    const dispatcher = new NotificationDispatcher(
      notificationsRepository,
      usersRepository,
      new FakeEventBus(),
      new SendNotificationUseCase(notificationsRepository),
    );

    // The constructor registers the handler on the DomainEvents registry.
    new OnFriendshipRequested(dispatcher);
  });

  it('notifies the addressee when a request is opened', async () => {
    const requester = makeUser();
    const addressee = makeUser();
    usersRepository.items.push(requester, addressee);

    const friendship = makeFriendship({
      requesterId: new UniqueEntityID(requester.publicId),
      addresseeId: new UniqueEntityID(addressee.publicId),
    });

    // request() raises the event; create() dispatches it.
    friendship.request();
    await friendshipsRepository.create(friendship);

    await waitFor(() => {
      expect(notificationsRepository.items).toHaveLength(1);
      expect(notificationsRepository.items[0].type).toBe('FRIEND_REQUEST');
      expect(notificationsRepository.items[0].recipientId.toString()).toBe(addressee.publicId);
    });
  });
});
