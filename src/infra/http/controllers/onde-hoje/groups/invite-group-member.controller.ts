import { Controller, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { InviteGroupMemberUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/invite-group-member';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { GroupMembershipResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/group-presenter-schema';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class InviteGroupMemberController {
  constructor(@Inject(InviteGroupMemberUseCase) private inviteGroupMemberUseCase: InviteGroupMemberUseCase) {}

  @Post('/:groupPublicId/members/:username/invite')
  @ApiOperation({ summary: 'Invite a user to a group by username. Only the group owner can invite.' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiParam({ name: 'username', type: String })
  @ApiCreatedResponse({ description: 'Member invited successfully.', type: GroupMembershipResponseDto })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Param('groupPublicId') groupPublicId: string,
    @Param('username') username: string,
  ) {
    const result = await this.inviteGroupMemberUseCase.execute({
      currentUserPublicId: currentUser.sub,
      groupPublicId,
      memberUsername: username,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.membership;
  }
}
