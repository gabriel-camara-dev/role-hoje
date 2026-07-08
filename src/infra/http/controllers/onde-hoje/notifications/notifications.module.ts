import { Module } from '@nestjs/common';
import { ListNotificationsUseCase } from '@/domain/main/application/use-cases/onde-hoje/notifications/list-notifications';
import { MarkNotificationReadUseCase } from '@/domain/main/application/use-cases/onde-hoje/notifications/mark-notification-read';
import { NotificationDispatcher } from '@/domain/main/application/use-cases/onde-hoje/notifications/notification-dispatcher';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { ListNotificationsController } from './list-notifications.controller';
import { MarkNotificationReadController } from './mark-notification-read.controller';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [ListNotificationsController, MarkNotificationReadController],
  providers: [ListNotificationsUseCase, MarkNotificationReadUseCase, NotificationDispatcher],
  exports: [NotificationDispatcher],
})
export class NotificationsModule {}
