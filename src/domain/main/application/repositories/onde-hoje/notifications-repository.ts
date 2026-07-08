import type { Notification, NotificationType } from '../../../enterprise/entities/onde-hoje/notifications/notification';

export interface CreateNotificationData {
  recipientId: number;
  actorId?: number | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

export abstract class NotificationsRepository {
  abstract create(data: CreateNotificationData): Promise<Notification>;
  abstract listForUser(userId: number, limit?: number): Promise<Notification[]>;
  abstract countUnread(userId: number): Promise<number>;
  abstract markRead(userId: number, publicId: string): Promise<boolean>;
  abstract markAllRead(userId: number): Promise<number>;
}
