import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'List the current user notifications (paginated) with the unread count.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ description: 'Notifications listed successfully.' })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.listNotificationsUseCase.execute({
      currentUserPublicId: currentUser.sub,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    const { notifications, unreadCount, hasMore } = result.value;

    return {
      unreadCount,
      hasMore,
      notifications: notifications.map(NotificationPresenter.toHTTP),
    };
  }
}
