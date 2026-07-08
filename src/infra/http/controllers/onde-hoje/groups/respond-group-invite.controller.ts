import { Controller, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RespondGroupInviteUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/respond-group-invite';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class RespondGroupInviteController {
  constructor(@Inject(RespondGroupInviteUseCase) private respondGroupInviteUseCase: RespondGroupInviteUseCase) {}

  @Post('/:groupPublicId/invitation/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept a pending group invite addressed to the current user.' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiOkResponse({ description: 'Invite accepted.' })
  async accept(@CurrentUser() currentUser: UserPayload, @Param('groupPublicId') groupPublicId: string) {
    return this.respond(currentUser.sub, groupPublicId, 'accept');
  }

  @Post('/:groupPublicId/invitation/decline')
  @HttpCode(200)
  @ApiOperation({ summary: 'Decline a pending group invite addressed to the current user.' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiOkResponse({ description: 'Invite declined.' })
  async decline(@CurrentUser() currentUser: UserPayload, @Param('groupPublicId') groupPublicId: string) {
    return this.respond(currentUser.sub, groupPublicId, 'decline');
  }

  private async respond(currentUserPublicId: string, groupPublicId: string, action: 'accept' | 'decline') {
    const result = await this.respondGroupInviteUseCase.execute({
      currentUserPublicId,
      groupPublicId,
      action,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.membership ?? { status: 'DECLINED' };
  }
}
