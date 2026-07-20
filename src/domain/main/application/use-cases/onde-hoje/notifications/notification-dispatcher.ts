import { Inject, Injectable } from '@nestjs/common';
import { createIntegrationEvent } from '@/core/events/integration-event';
import { EventBus } from '@/core/events/event-bus';
import type {
  Notification,
  NotificationActor,
  NotificationType,
} from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';
import type { User } from '@/domain/main/enterprise/entities/user';
import { NotificationsRepository } from '../../../repositories/onde-hoje/notifications-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { SendNotificationUseCase } from './send-notification';

export interface DispatchNotificationInput {
  recipientPublicId: string;
  actorPublicId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

/**
 * Real-time adapter around {@link SendNotificationUseCase}: resolves the actor,
 * persists through the use case, then publishes an integration event so the SSE
 * endpoint pushes it live. Never throws — a failure to notify must not break the
 * action that triggered it. The aggregated path stays here for the vote fan-out.
 */
@Injectable()
export class NotificationDispatcher {
  constructor(
    @Inject(NotificationsRepository) private notificationsRepository: NotificationsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
    @Inject(SendNotificationUseCase) private sendNotification: SendNotificationUseCase,
  ) {}

  async dispatch(input: DispatchNotificationInput): Promise<void> {
    try {
      const actor =
        input.actorPublicId && input.actorPublicId !== input.recipientPublicId
          ? await this.usersRepository.findByPublicId(input.actorPublicId)
          : null;

      const result = await this.sendNotification.execute({
        recipientPublicId: input.recipientPublicId,
        actor: actor ? NotificationDispatcher.toActor(actor) : null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        data: input.data ?? null,
      });

      if (result.isFail()) {
        return;
      }

      await this.publishRealtime(result.value.notification, input.actorPublicId ?? undefined, input.recipientPublicId);
    } catch {
      // Swallowing on purpose: notifications are best-effort side effects.
    }
  }

  /**
   * Accumulates "someone voted here" notifications into a single row per place
   * (Twitter-likes style): each new vote bumps the count and appends the voter.
   */
  async dispatchAggregatedVote(input: {
    recipientPublicId: string;
    groupKey: string;
    placeName: string;
    placePublicId: string;
    actor: { publicId: string; name: string; username: string; avatarUrl: string | null } | null;
  }): Promise<void> {
    try {
      const existing = await this.notificationsRepository.findLatestByGroupKey(input.recipientPublicId, input.groupKey);
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

      const notification = await this.notificationsRepository.upsertAggregated({
        recipientPublicId: input.recipientPublicId,
        groupKey: input.groupKey,
        type: 'PLACE_VOTE',
        title,
        data: { count, placeName: input.placeName, placePublicId: input.placePublicId, voters },
      });

      await this.publishRealtime(notification, input.actor?.publicId, input.recipientPublicId);
    } catch {
      // Best-effort side effect.
    }
  }

  private async publishRealtime(
    notification: Notification,
    actorPublicId: string | undefined,
    recipientPublicId: string,
  ) {
    await this.eventBus.publish(
      createIntegrationEvent({
        eventName: 'notification.created',
        aggregateId: notification.id.toString(),
        actorId: actorPublicId,
        payload: NotificationDispatcher.toPayload(notification),
        recipientIds: [recipientPublicId],
      }),
    );
  }

  private static toActor(user: User): NotificationActor {
    return {
      publicId: user.publicId,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUpdatedAt ? `/users/${user.publicId}/avatar` : null,
    };
  }

  private static toPayload(notification: Notification) {
    return {
      id: notification.id.toString(),
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      read: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      actor: notification.actor,
    };
  }
}
