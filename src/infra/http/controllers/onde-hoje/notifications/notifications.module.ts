import { Module } from '@nestjs/common';
import { ListNotificationsUseCase } from '@/domain/main/application/use-cases/onde-hoje/notifications/list-notifications';
import { MarkNotificationReadUseCase } from '@/domain/main/application/use-cases/onde-hoje/notifications/mark-notification-read';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { ListNotificationsController } from './list-notifications.controller';
import { MarkNotificationReadController } from './mark-notification-read.controller';

/**
 * The read side of notifications (list + mark). Producing them lives in
 * EventsModule (dispatcher + subscribers); importing it here keeps the
 * NotificationDispatcher reachable for anything wired through this module.
 */
@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [ListNotificationsController, MarkNotificationReadController],
  providers: [ListNotificationsUseCase, MarkNotificationReadUseCase],
})
export class NotificationsModule {}
