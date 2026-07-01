import { Controller, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AcceptFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/accept-friendship';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { FriendshipStatusResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/friend-presenter-schema';

@ApiTags('Onde Hoje - Friends')
@ApiBearerAuth()
@Controller('/friends')
export class AcceptFriendshipController {
  constructor(@Inject(AcceptFriendshipUseCase) private acceptFriendshipUseCase: AcceptFriendshipUseCase) {}

  @Post('/:userPublicId/accept')
  @ApiOperation({ summary: 'Accept a friend request received from a user' })
  @ApiParam({ name: 'userPublicId', type: String })
  @ApiCreatedResponse({ description: 'Friend request accepted successfully.', type: FriendshipStatusResponseDto })
  async handle(@CurrentUser() currentUser: UserPayload, @Param('userPublicId') userPublicId: string) {
    const result = await this.acceptFriendshipUseCase.execute({
      currentUserPublicId: currentUser.sub,
      requesterPublicId: userPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return { status: result.value.status };
  }
}
