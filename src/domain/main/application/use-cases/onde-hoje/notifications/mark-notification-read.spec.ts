import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { MarkNotificationReadUseCase } from './mark-notification-read';
import { makeNotification } from '@test/factories/make-notification';
import { makeUser } from '@test/factories/make-user';
import { InMemoryNotificationsRepository } from '@test/repositories/in-memory-notifications-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let notificationsRepository: InMemoryNotificationsRepository;
let sut: MarkNotificationReadUseCase;

function seedUnread(recipientPublicId: string) {
  const notification = makeNotification({ recipientId: new UniqueEntityID(recipientPublicId) });
  notificationsRepository.items.push(notification);

  return notification;
}

describe('Mark Notification Read', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    notificationsRepository = new InMemoryNotificationsRepository();
    sut = new MarkNotificationReadUseCase(notificationsRepository, usersRepository);
  });

  it('marks a single notification read and returns the remaining unread count', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    const target = seedUnread(user.publicId);
    seedUnread(user.publicId);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      notificationPublicId: target.id.toString(),
    });

    expect(result.isSuccess()).toBe(true);
    expect((result as { value: { unreadCount: number } }).value.unreadCount).toBe(1);
    expect(target.isRead).toBe(true);
  });

  it('marks all notifications read when no id is given', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    seedUnread(user.publicId);
    seedUnread(user.publicId);

    const result = await sut.execute({ currentUserPublicId: user.publicId });

    expect((result as { value: { unreadCount: number } }).value.unreadCount).toBe(0);
  });

  it('does not mark a notification that belongs to someone else', async () => {
    const user = makeUser();
    const other = makeUser();
    usersRepository.items.push(user, other);
    const theirs = seedUnread(other.publicId);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      notificationPublicId: theirs.id.toString(),
    });

    expect(result.isSuccess()).toBe(true);
    expect(theirs.isRead).toBe(false);
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({ currentUserPublicId: 'non-existing-public-id' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
