import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { ListNotificationsUseCase } from './list-notifications';
import { makeNotification } from '@test/factories/make-notification';
import { makeUser } from '@test/factories/make-user';
import { InMemoryNotificationsRepository } from '@test/repositories/in-memory-notifications-repository';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let notificationsRepository: InMemoryNotificationsRepository;
let sut: ListNotificationsUseCase;

function seed(recipientPublicId: string, createdAt: Date, readAt: Date | null = null) {
  notificationsRepository.items.push(
    makeNotification({ recipientId: new UniqueEntityID(recipientPublicId), createdAt, readAt }),
  );
}

describe('List Notifications', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    notificationsRepository = new InMemoryNotificationsRepository();
    sut = new ListNotificationsUseCase(notificationsRepository, usersRepository);
  });

  it('returns the user notifications newest first with the unread count', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    seed(user.publicId, new Date(2026, 0, 1), new Date());
    seed(user.publicId, new Date(2026, 0, 2));

    const result = await sut.execute({ currentUserPublicId: user.publicId });
    const { notifications, unreadCount, hasMore } = (
      result as { value: { notifications: Array<{ createdAt: Date }>; unreadCount: number; hasMore: boolean } }
    ).value;

    expect(notifications).toHaveLength(2);
    expect(notifications[0].createdAt.getTime()).toBeGreaterThan(notifications[1].createdAt.getTime());
    expect(unreadCount).toBe(1);
    expect(hasMore).toBe(false);
  });

  it('flags hasMore and caps the page when there are more than the limit', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    for (let day = 1; day <= 7; day++) {
      seed(user.publicId, new Date(2026, 0, day));
    }

    const result = await sut.execute({ currentUserPublicId: user.publicId, limit: 5 });
    const { notifications, hasMore } = (result as { value: { notifications: unknown[]; hasMore: boolean } }).value;

    expect(notifications).toHaveLength(5);
    expect(hasMore).toBe(true);
  });

  it('does not include other users notifications', async () => {
    const user = makeUser();
    const other = makeUser();
    usersRepository.items.push(user, other);
    seed(other.publicId, new Date());

    const result = await sut.execute({ currentUserPublicId: user.publicId });

    expect((result as { value: { notifications: unknown[] } }).value.notifications).toEqual([]);
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({ currentUserPublicId: 'non-existing-public-id' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
