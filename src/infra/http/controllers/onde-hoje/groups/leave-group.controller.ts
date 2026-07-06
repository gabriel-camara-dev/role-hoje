import { Controller, Delete, HttpCode, Inject, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { LeaveGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/leave-group';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class LeaveGroupController {
  constructor(@Inject(LeaveGroupUseCase) private leaveGroupUseCase: LeaveGroupUseCase) {}

  @Delete('/:groupPublicId/members/me')
  @HttpCode(204)
  @ApiOperation({ summary: 'Leave a group. If the owner leaves, ownership moves to the oldest active member.' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiNoContentResponse({ description: 'Group left successfully.' })
  async handle(@CurrentUser() currentUser: UserPayload, @Param('groupPublicId') groupPublicId: string) {
    const result = await this.leaveGroupUseCase.execute({
      currentUserPublicId: currentUser.sub,
      groupPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }
  }
}
