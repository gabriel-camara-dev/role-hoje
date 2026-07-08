import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { Notification } from '@/domain/main/enterprise/entities/onde-hoje/notifications/notification';
import { NotificationsRepository } from '../../../repositories/onde-hoje/notifications-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface ListNotificationsUseCaseRequest {
  currentUserPublicId: string;
}

type ListNotificationsUseCaseResponse = Result<
  ResourceNotFoundError,
  { notifications: Notification[]; unreadCount: number }
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

    const [notifications, unreadCount] = await Promise.all([
      this.notificationsRepository.listForUser(user.id),
      this.notificationsRepository.countUnread(user.id),
    ]);

    return success({ notifications, unreadCount });
  }
}
