import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { Notification } from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';
import { NotificationsRepository } from '../../../repositories/onde-hoje/notifications-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface ListNotificationsUseCaseRequest {
  currentUserPublicId: string;
  limit?: number;
  offset?: number;
}

type ListNotificationsUseCaseResponse = Result<
  ResourceNotFoundError,
  { notifications: Notification[]; unreadCount: number; hasMore: boolean }
>;

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NotificationsRepository) private notificationsRepository: NotificationsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: ListNotificationsUseCaseRequest): Promise<ListNotificationsUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const limit = Math.min(Math.max(request.limit ?? 5, 1), 30);
    const offset = Math.max(request.offset ?? 0, 0);

    const [page, unreadCount] = await Promise.all([
      // Fetch one extra row to know whether there is a next page.
      this.notificationsRepository.findManyByRecipientId(user.publicId, limit + 1, offset),
      this.notificationsRepository.countUnread(user.publicId),
    ]);

    const hasMore = page.length > limit;
    const notifications = hasMore ? page.slice(0, limit) : page;

    return success({ notifications, unreadCount, hasMore });
  }
}
