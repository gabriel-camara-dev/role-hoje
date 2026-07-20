import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import {
  Notification,
  type NotificationActor,
  type NotificationType,
} from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';
import { NotificationsRepository } from '../../../repositories/onde-hoje/notifications-repository';

export interface SendNotificationUseCaseRequest {
  recipientPublicId: string;
  actor?: NotificationActor | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

type SendNotificationUseCaseResponse = Result<null, { notification: Notification }>;

@Injectable()
export class SendNotificationUseCase {
  constructor(@Inject(NotificationsRepository) private notificationsRepository: NotificationsRepository) {}

  async execute(request: SendNotificationUseCaseRequest): Promise<SendNotificationUseCaseResponse> {
    const notification = Notification.create({
      recipientId: new UniqueEntityID(request.recipientPublicId),
      actor: request.actor ?? null,
      type: request.type,
      title: request.title,
      body: request.body ?? null,
      data: request.data ?? null,
    });

    await this.notificationsRepository.create(notification);

    return success({ notification });
  }
}
