import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListNotificationsUseCase } from '@/domain/main/application/use-cases/onde-hoje/notifications/list-notifications';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { NotificationPresenter } from '@/infra/http/presenters/onde-hoje/notification-presenter';

@ApiTags('Onde Hoje - Notifications')
@ApiBearerAuth()
@Controller('/notifications')
export class ListNotificationsController {
  constructor(@Inject(ListNotificationsUseCase) private listNotificationsUseCase: ListNotificationsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List the current user notifications with the unread count.' })
  @ApiOkResponse({ description: 'Notifications listed successfully.' })
  async handle(@CurrentUser() currentUser: UserPayload) {
    const result = await this.listNotificationsUseCase.execute({ currentUserPublicId: currentUser.sub });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    const { notifications, unreadCount } = result.value;

    return {
      unreadCount,
      notifications: notifications.map(NotificationPresenter.toHTTP),
    };
  }
}
