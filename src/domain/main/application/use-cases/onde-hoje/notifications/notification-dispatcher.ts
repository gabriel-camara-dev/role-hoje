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

  /**
   * Accumulates "someone voted here" notifications into a single row per place
   * (Twitter-likes style): each new vote bumps the count and appends the voter.
   * Works with the recipient's internal id to avoid a lookup per fan-out target.
   */
  async dispatchAggregatedVote(input: {
    recipientId: number;
    recipientPublicId: string;
    groupKey: string;
    placeName: string;
    placePublicId: string;
    actor: { publicId: string; name: string; username: string; avatarUrl: string | null } | null;
  }): Promise<void> {
    try {
      const existing = await this.notificationsRepository.findLatestByGroupKey(input.recipientId, input.groupKey);
      const previous = (existing?.data ?? {}) as {
        count?: number;
        voters?: Array<{ publicId: string; name: string; username: string; avatarUrl: string | null }>;
      };

      const count = (previous.count ?? 0) + 1;
      const previousVoters = previous.voters ?? [];
      const voters = input.actor
        ? [input.actor, ...previousVoters.filter((voter) => voter.publicId !== input.actor?.publicId)].slice(0, 20)
        : previousVoters;

      const title =
        count === 1 ? `1 pessoa votou em ${input.placeName}` : `${count} pessoas votaram em ${input.placeName}`;

      const data = {
        count,
        placeName: input.placeName,
        placePublicId: input.placePublicId,
        voters,
      };

      const notification = await this.notificationsRepository.upsertAggregated({
        recipientId: input.recipientId,
        groupKey: input.groupKey,
        type: 'PLACE_VOTE',
        title,
        data,
      });

      await this.eventBus.publish(
        createDomainEvent({
          eventName: 'notification.created',
          aggregateId: notification.publicId,
          actorId: input.actor?.publicId,
          payload: NotificationDispatcher.toPayload(notification),
          recipientIds: [input.recipientPublicId],
        }),
      );
    } catch {
      // Best-effort side effect.
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
