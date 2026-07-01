import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListFriendsUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/list-friends';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { FriendListItemResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/friend-presenter-schema';

@ApiTags('Onde Hoje - Friends')
@ApiBearerAuth()
@Controller('/friends')
export class ListFriendsController {
  constructor(@Inject(ListFriendsUseCase) private listFriendsUseCase: ListFriendsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List accepted friends and pending requests' })
  @ApiOkResponse({ description: 'Friends retrieved successfully.', type: [FriendListItemResponseDto] })
  async handle(@CurrentUser() currentUser: UserPayload) {
    const result = await this.listFriendsUseCase.execute({
      currentUserPublicId: currentUser.sub,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.friends;
  }
}
