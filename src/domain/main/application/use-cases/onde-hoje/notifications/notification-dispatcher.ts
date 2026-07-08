import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Notification, NotificationType } from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';
import { NotificationsRepository } from '../../../repositories/onde-hoje/notifications-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';

export interface DispatchNotificationInput {
  recipientPublicId: string;
  actorPublicId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationDispatcher {
  constructor(
    @Inject(NotificationsRepository) private notificationsRepository: NotificationsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  /**
   * Persists a notification for the recipient and pushes it in real time
   * through the domain event bus (SSE). Never throws: a failure to notify
   * must not break the action that triggered it.
   */
  async dispatch(input: DispatchNotificationInput): Promise<void> {
    try {
      const recipient = await this.usersRepository.findByPublicId(input.recipientPublicId);

      if (!recipient) {
        return;
      }

      const actor =
        input.actorPublicId && input.actorPublicId !== input.recipientPublicId
          ? await this.usersRepository.findByPublicId(input.actorPublicId)
          : null;

      const notification = await this.notificationsRepository.create({
        recipientId: recipient.id,
        actorId: actor?.id ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        data: input.data ?? null,
      });

      await this.eventBus.publish(
        createDomainEvent({
          eventName: 'notification.created',
          aggregateId: notification.publicId,
          actorId: input.actorPublicId ?? undefined,
          payload: NotificationDispatcher.toPayload(notification),
          recipientIds: [input.recipientPublicId],
        }),
      );
    } catch {
      // Swallowing on purpose: notifications are best-effort side effects.
    }
  }

  private static toPayload(notification: Notification) {
    return {
      id: notification.publicId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
      actor: notification.actor,
    };
  }
}
