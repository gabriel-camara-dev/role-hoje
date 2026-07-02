import { Controller, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RejectFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/reject-friendship';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';

@ApiTags('Onde Hoje - Friends')
@ApiBearerAuth()
@Controller('/friends')
export class RejectFriendshipController {
  constructor(@Inject(RejectFriendshipUseCase) private rejectFriendshipUseCase: RejectFriendshipUseCase) {}

  @Post('/:username/reject')
  @HttpCode(204)
  @ApiOperation({ summary: 'Reject a friend request received from a username' })
  @ApiParam({ name: 'username', type: String })
  @ApiNoContentResponse({ description: 'Friend request rejected successfully.' })
  async handle(@CurrentUser() currentUser: UserPayload, @Param('username') username: string) {
    const result = await this.rejectFriendshipUseCase.execute({
      currentUserPublicId: currentUser.sub,
      requesterUsername: username,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }
  }
}
