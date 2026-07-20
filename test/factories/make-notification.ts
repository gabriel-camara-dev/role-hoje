import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import {
  Notification,
  type NotificationProps,
} from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';

export function makeNotification(override: Partial<NotificationProps> = {}, id?: UniqueEntityID) {
  return Notification.create(
    {
      recipientId: new UniqueEntityID(),
      type: 'FRIEND_REQUEST',
      title: 'Novo pedido de amizade',
      ...override,
    },
    id,
  );
}
