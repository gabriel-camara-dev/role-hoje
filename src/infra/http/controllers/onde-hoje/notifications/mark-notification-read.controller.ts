import { Controller, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MarkNotificationReadUseCase } from '@/domain/main/application/use-cases/onde-hoje/notifications/mark-notification-read';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';

@ApiTags('Onde Hoje - Notifications')
@ApiBearerAuth()
@Controller('/notifications')
export class MarkNotificationReadController {
  constructor(@Inject(MarkNotificationReadUseCase) private markNotificationReadUseCase: MarkNotificationReadUseCase) {}

  @Post('/read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark every notification of the current user as read.' })
  @ApiOkResponse({ description: 'Notifications marked as read.' })
  async markAll(@CurrentUser() currentUser: UserPayload) {
    return this.mark(currentUser.sub);
  }

  @Post('/:notificationPublicId/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a single notification as read.' })
  @ApiParam({ name: 'notificationPublicId', type: String })
  @ApiOkResponse({ description: 'Notification marked as read.' })
  async markOne(
    @CurrentUser() currentUser: UserPayload,
    @Param('notificationPublicId') notificationPublicId: string,
  ) {
    return this.mark(currentUser.sub, notificationPublicId);
  }

  private async mark(currentUserPublicId: string, notificationPublicId?: string) {
    const result = await this.markNotificationReadUseCase.execute({
      currentUserPublicId,
      notificationPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value;
  }
}
