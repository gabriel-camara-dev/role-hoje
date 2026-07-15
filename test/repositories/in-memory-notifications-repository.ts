import { randomUUID } from 'node:crypto';
import {
  type CreateNotificationData,
  NotificationsRepository,
  type UpsertAggregatedNotificationData,
} from '@/domain/main/application/repositories/onde-hoje/notifications-repository';
import type { Notification } from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';
import type { InMemoryOndeHojeUsersRepository } from './in-memory-onde-hoje-users-repository';

interface StoredNotification extends Notification {
  recipientId: number;
  groupKey: string | null;
}

export class InMemoryNotificationsRepository extends NotificationsRepository {
  public items: StoredNotification[] = [];

  constructor(private usersRepository: InMemoryOndeHojeUsersRepository) {
    super();
  }

  private actorFor(actorId?: number | null) {
    if (!actorId) {
      return null;
    }

    const actor = this.usersRepository.items.find((user) => user.id === actorId);

    if (!actor) {
      return null;
    }

    return {
      publicId: actor.publicId,
      name: actor.name,
      username: actor.username,
      avatarUrl: null,
    };
  }

  private toNotification(stored: StoredNotification): Notification {
    const { recipientId: _recipientId, groupKey: _groupKey, ...notification } = stored;
    return notification;
  }

  async create(data: CreateNotificationData): Promise<Notification> {
    const stored: StoredNotification = {
      recipientId: data.recipientId,
      groupKey: null,
      publicId: randomUUID(),
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      data: data.data ?? null,
      read: false,
      createdAt: new Date(),
      actor: this.actorFor(data.actorId),
    };

    this.items.push(stored);

    return this.toNotification(stored);
  }

  async listForUser(userId: number, limit = 20, offset = 0): Promise<Notification[]> {
    return this.items
      .filter((item) => item.recipientId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)
      .map((item) => this.toNotification(item));
  }

  async countUnread(userId: number): Promise<number> {
    return this.items.filter((item) => item.recipientId === userId && !item.read).length;
  }

  async markRead(userId: number, publicId: string): Promise<boolean> {
    const notification = this.items.find(
      (item) => item.recipientId === userId && item.publicId === publicId,
    );

    if (!notification || notification.read) {
      return false;
    }

    notification.read = true;

    return true;
  }

  async markAllRead(userId: number): Promise<number> {
    const unread = this.items.filter((item) => item.recipientId === userId && !item.read);

    for (const notification of unread) {
      notification.read = true;
    }

    return unread.length;
  }

  async findLatestByGroupKey(userId: number, groupKey: string): Promise<Notification | null> {
    const found = this.items
      .filter((item) => item.recipientId === userId && item.groupKey === groupKey)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return found ? this.toNotification(found) : null;
  }

  async upsertAggregated(data: UpsertAggregatedNotificationData): Promise<Notification> {
    const existing = this.items.find(
      (item) => item.recipientId === data.recipientId && item.groupKey === data.groupKey,
    );

    if (existing) {
      existing.title = data.title;
      existing.data = data.data ?? null;
      existing.read = false;
      existing.createdAt = new Date();

      return this.toNotification(existing);
    }

    const stored: StoredNotification = {
      recipientId: data.recipientId,
      groupKey: data.groupKey,
      publicId: randomUUID(),
      type: data.type,
      title: data.title,
      body: null,
      data: data.data ?? null,
      read: false,
      createdAt: new Date(),
      actor: null,
    };

    this.items.push(stored);

    return this.toNotification(stored);
  }
}
