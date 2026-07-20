import { SendNotificationUseCase } from './send-notification';
import { makeUser } from '@test/factories/make-user';
import { InMemoryNotificationsRepository } from '@test/repositories/in-memory-notifications-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let notificationsRepository: InMemoryNotificationsRepository;
let sut: SendNotificationUseCase;

describe('Send Notification', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    notificationsRepository = new InMemoryNotificationsRepository();
    sut = new SendNotificationUseCase(notificationsRepository);
  });

  it('persists a notification for the recipient', async () => {
    const recipient = makeUser();
    usersRepository.items.push(recipient);

    const result = await sut.execute({
      recipientPublicId: recipient.publicId,
      type: 'FRIEND_REQUEST',
      title: 'Novo pedido de amizade',
      body: 'Toque para responder.',
    });

    expect(result.isSuccess()).toBe(true);
    expect(notificationsRepository.items).toHaveLength(1);

    const [notification] = notificationsRepository.items;

    expect(notification.recipientId.toString()).toBe(recipient.publicId);
    expect(notification.type).toBe('FRIEND_REQUEST');
    expect(notification.title).toBe('Novo pedido de amizade');
    expect(notification.isRead).toBe(false);
  });

  it('returns the created notification with an actor when given one', async () => {
    const recipient = makeUser();
    usersRepository.items.push(recipient);

    const actor = { publicId: 'actor-id', name: 'Ana', username: 'ana', avatarUrl: null };

    const result = await sut.execute({
      recipientPublicId: recipient.publicId,
      actor,
      type: 'GROUP_INVITE',
      title: 'Convite',
    });

    expect((result as { value: { notification: { actor: unknown } } }).value.notification.actor).toEqual(actor);
  });
});
