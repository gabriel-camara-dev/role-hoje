import { Controller, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JoinGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/join-group';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { GroupMembershipResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/group-presenter-schema';

@ApiTags('Onde Hoje - Groups')
@ApiBearerAuth()
@Controller('/groups')
export class JoinGroupController {
  constructor(@Inject(JoinGroupUseCase) private joinGroupUseCase: JoinGroupUseCase) {}

  @Post('/:groupPublicId/join')
  @ApiOperation({ summary: 'Join a public group or request access to a private one' })
  @ApiParam({ name: 'groupPublicId', type: String })
  @ApiCreatedResponse({ description: 'Membership created or updated successfully.', type: GroupMembershipResponseDto })
  async handle(@CurrentUser() currentUser: UserPayload, @Param('groupPublicId') groupPublicId: string) {
    const result = await this.joinGroupUseCase.execute({
      currentUserPublicId: currentUser.sub,
      groupPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.membership;
  }
}
