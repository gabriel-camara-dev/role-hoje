import type { Notification } from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';

export class NotificationPresenter {
  static toHTTP(notification: Notification) {
    return {
      id: notification.publicId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
      actor: notification.actor
        ? {
            publicId: notification.actor.publicId,
            name: notification.actor.name,
            username: notification.actor.username,
            avatarUrl: notification.actor.avatarUrl,
          }
        : null,
    };
  }
}
