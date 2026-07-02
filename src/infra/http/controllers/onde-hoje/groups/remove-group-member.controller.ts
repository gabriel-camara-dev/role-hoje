import { Controller, Delete, HttpCode, Inject, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RemoveGroupMemberUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/remove-group-member';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class RemoveGroupMemberController {
  constructor(@Inject(RemoveGroupMemberUseCase) private removeGroupMemberUseCase: RemoveGroupMemberUseCase) {}

  @Delete('/:groupPublicId/members/:username')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a group member by username. Only the group owner can remove.' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiParam({ name: 'username', type: String })
  @ApiNoContentResponse({ description: 'Member removed successfully.' })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Param('groupPublicId') groupPublicId: string,
    @Param('username') username: string,
  ) {
    const result = await this.removeGroupMemberUseCase.execute({
      currentUserPublicId: currentUser.sub,
      groupPublicId,
      memberUsername: username,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }
  }
}
