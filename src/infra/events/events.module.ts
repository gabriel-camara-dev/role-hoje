import { Module } from '@nestjs/common';
import { EventBus } from '@/core/events/event-bus';
import { OnFriendshipAccepted } from '@/domain/main/application/subscribers/onde-hoje/friendships/on-friendship-accepted';
import { OnFriendshipRequested } from '@/domain/main/application/subscribers/onde-hoje/friendships/on-friendship-requested';
import { OnGroupInviteAccepted } from '@/domain/main/application/subscribers/onde-hoje/groups/on-group-invite-accepted';
import { OnGroupJoinRequested } from '@/domain/main/application/subscribers/onde-hoje/groups/on-group-join-requested';
import { OnGroupMemberAccepted } from '@/domain/main/application/subscribers/onde-hoje/groups/on-group-member-accepted';
import { OnGroupMemberInvited } from '@/domain/main/application/subscribers/onde-hoje/groups/on-group-member-invited';
import { NotificationDispatcher } from '@/domain/main/application/use-cases/onde-hoje/notifications/notification-dispatcher';
import { SendNotificationUseCase } from '@/domain/main/application/use-cases/onde-hoje/notifications/send-notification';
import { CacheModule } from '@/infra/cache/cache.module';
import { DatabaseModule } from '@/infra/database/database.module';
import { RedisEventBus } from './redis-event-bus';

/**
 * Owns both event concerns: the {@link EventBus} transport (Redis → SSE) and the
 * in-process domain-event subscribers that turn group facts into notifications.
 * Keeping the notification-producing pieces here (like the reference EventsModule)
 * avoids a cycle with NotificationsModule, which only reads notifications.
 */
@Module({
  imports: [CacheModule, DatabaseModule],
  providers: [
    RedisEventBus,
    {
      provide: EventBus,
      useExisting: RedisEventBus,
    },
    SendNotificationUseCase,
    NotificationDispatcher,
    OnGroupMemberAccepted,
    OnGroupMemberInvited,
    OnGroupInviteAccepted,
    OnGroupJoinRequested,
    OnFriendshipRequested,
    OnFriendshipAccepted,
  ],
  exports: [EventBus, NotificationDispatcher],
})
export class EventsModule {}
