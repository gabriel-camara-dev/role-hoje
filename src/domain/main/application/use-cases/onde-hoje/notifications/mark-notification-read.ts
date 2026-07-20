import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { NotificationsRepository } from '../../../repositories/onde-hoje/notifications-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface MarkNotificationReadUseCaseRequest {
  currentUserPublicId: string;
  notificationPublicId?: string;
}

type MarkNotificationReadUseCaseResponse = Result<ResourceNotFoundError, { unreadCount: number }>;

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NotificationsRepository) private notificationsRepository: NotificationsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: MarkNotificationReadUseCaseRequest): Promise<MarkNotificationReadUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    if (request.notificationPublicId) {
      const notification = await this.notificationsRepository.findById(request.notificationPublicId);

      // Only the owner may mark it, and only if it is still unread.
      if (notification && notification.recipientId.toString() === user.publicId && !notification.isRead) {
        notification.read();
        await this.notificationsRepository.save(notification);
      }
    } else {
      await this.notificationsRepository.markAllRead(user.publicId);
    }

    const unreadCount = await this.notificationsRepository.countUnread(user.publicId);

    return success({ unreadCount });
  }
}
