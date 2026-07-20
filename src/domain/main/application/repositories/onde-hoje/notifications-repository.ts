import type { Notification, NotificationType } from '../../../enterprise/entities/onde-hoje/notifications/notification';

export interface UpsertAggregatedNotificationData {
  recipientPublicId: string;
  groupKey: string;
  type: NotificationType;
  title: string;
  data?: Record<string, unknown> | null;
}

/**
 * Reference-shaped core (`findById`/`create`/`save`, entity in and out) plus the
 * read models the listing and unread badge need. `upsertAggregated` serves the
 * vote fan-out, which collapses repeated votes into a single row per `groupKey`.
 */
export abstract class NotificationsRepository {
  abstract findById(id: string): Promise<Notification | null>;
  abstract create(notification: Notification): Promise<void>;
  abstract save(notification: Notification): Promise<void>;
  abstract findManyByRecipientId(recipientPublicId: string, limit?: number, offset?: number): Promise<Notification[]>;
  abstract countUnread(recipientPublicId: string): Promise<number>;
  abstract markAllRead(recipientPublicId: string): Promise<number>;
  abstract findLatestByGroupKey(recipientPublicId: string, groupKey: string): Promise<Notification | null>;
  abstract upsertAggregated(data: UpsertAggregatedNotificationData): Promise<Notification>;
}
