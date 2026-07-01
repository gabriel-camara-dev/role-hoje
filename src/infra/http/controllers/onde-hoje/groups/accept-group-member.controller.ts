import { Controller, Inject, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AcceptGroupMemberUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/accept-group-member';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { GroupMembershipResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/group-presenter-schema';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class AcceptGroupMemberController {
  constructor(@Inject(AcceptGroupMemberUseCase) private acceptGroupMemberUseCase: AcceptGroupMemberUseCase) {}

  @Post('/:groupPublicId/members/:userPublicId/accept')
  @ApiOperation({ summary: 'Accept a pending member request. Only the group leader can accept.' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiParam({ name: 'userPublicId', type: String })
  @ApiCreatedResponse({ description: 'Member request accepted successfully.', type: GroupMembershipResponseDto })
  @ApiForbiddenResponse({ description: 'Only the group leader can accept members.' })
  @ApiNotFoundResponse({ description: 'Group or member request not found.' })
  @ApiConflictResponse({ description: 'Member request is not pending.' })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Param('groupPublicId') groupPublicId: string,
    @Param('userPublicId') userPublicId: string,
  ) {
    const result = await this.acceptGroupMemberUseCase.execute({
      currentUserPublicId: currentUser.sub,
      groupPublicId,
      memberPublicId: userPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.membership;
  }
}
