import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import {
  NotificationsRepository,
  type UpsertAggregatedNotificationData,
} from '@/domain/main/application/repositories/onde-hoje/notifications-repository';
import { Notification } from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';

export class InMemoryNotificationsRepository extends NotificationsRepository {
  public items: Notification[] = [];

  private byRecipient(recipientPublicId: string) {
    return this.items.filter((item) => item.recipientId.toString() === recipientPublicId);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null;
  }

  async create(notification: Notification): Promise<void> {
    this.items.push(notification);
  }

  async save(notification: Notification): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(notification.id));

    if (index >= 0) {
      this.items[index] = notification;
    }
  }

  async findManyByRecipientId(recipientPublicId: string, limit = 30, offset = 0): Promise<Notification[]> {
    return this.byRecipient(recipientPublicId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async countUnread(recipientPublicId: string): Promise<number> {
    return this.byRecipient(recipientPublicId).filter((item) => !item.isRead).length;
  }

  async markAllRead(recipientPublicId: string): Promise<number> {
    const unread = this.byRecipient(recipientPublicId).filter((item) => !item.isRead);

    for (const notification of unread) {
      notification.read();
    }

    return unread.length;
  }

  async findLatestByGroupKey(recipientPublicId: string, groupKey: string): Promise<Notification | null> {
    return (
      this.byRecipient(recipientPublicId)
        .filter((item) => item.groupKey === groupKey)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
    );
  }

  async upsertAggregated(data: UpsertAggregatedNotificationData): Promise<Notification> {
    const existing = this.byRecipient(data.recipientPublicId).find((item) => item.groupKey === data.groupKey);

    if (existing) {
      const refreshed = Notification.create(
        {
          recipientId: existing.recipientId,
          actor: existing.actor,
          type: existing.type,
          title: data.title,
          body: existing.body,
          data: data.data ?? null,
          groupKey: data.groupKey,
          readAt: null,
          createdAt: new Date(),
        },
        existing.id,
      );

      await this.save(refreshed);

      return refreshed;
    }

    const notification = Notification.create({
      recipientId: new UniqueEntityID(data.recipientPublicId),
      type: data.type,
      title: data.title,
      groupKey: data.groupKey,
      data: data.data ?? null,
    });

    this.items.push(notification);

    return notification;
  }
}
