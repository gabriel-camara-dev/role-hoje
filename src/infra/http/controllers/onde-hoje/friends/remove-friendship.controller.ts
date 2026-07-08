import { Controller, Delete, HttpCode, Inject, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RemoveFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/remove-friendship';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';

@ApiTags('Onde Hoje - Friends')
@ApiBearerAuth()
@Controller('/friends')
export class RemoveFriendshipController {
  constructor(@Inject(RemoveFriendshipUseCase) private removeFriendshipUseCase: RemoveFriendshipUseCase) {}

  @Delete('/:username')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove an existing friendship with a username' })
  @ApiParam({ name: 'username', type: String })
  @ApiNoContentResponse({ description: 'Friendship removed successfully.' })
  async handle(@CurrentUser() currentUser: UserPayload, @Param('username') username: string) {
    const result = await this.removeFriendshipUseCase.execute({
      currentUserPublicId: currentUser.sub,
      friendUsername: username,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }
  }
}
