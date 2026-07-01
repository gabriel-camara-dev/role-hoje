import { Controller, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequestFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/request-friendship';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { FriendshipStatusResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/friend-presenter-schema';

@ApiTags('Onde Hoje - Friends')
@ApiBearerAuth()
@Controller('/friends')
export class RequestFriendshipController {
  constructor(@Inject(RequestFriendshipUseCase) private requestFriendshipUseCase: RequestFriendshipUseCase) {}

  @Post('/:userPublicId/request')
  @ApiOperation({ summary: 'Send a friend request' })
  @ApiParam({ name: 'userPublicId', type: String })
  @ApiCreatedResponse({ description: 'Friend request sent successfully.', type: FriendshipStatusResponseDto })
  async handle(@CurrentUser() currentUser: UserPayload, @Param('userPublicId') userPublicId: string) {
    const result = await this.requestFriendshipUseCase.execute({
      currentUserPublicId: currentUser.sub,
      addresseePublicId: userPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return { status: result.value.status };
  }
}
