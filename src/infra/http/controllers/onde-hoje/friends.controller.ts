import { Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AcceptFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/accept-friendship';
import { ListFriendsUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/list-friends';
import { RequestFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/request-friendship';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import {
  FriendListItemResponseDto,
  FriendshipStatusResponseDto,
} from '@/infra/http/swagger/presenter-schemas/onde-hoje/friend-presenter-schema';

@ApiTags('Onde Hoje - Friends')
@ApiBearerAuth()
@Controller('/friends')
export class FriendsController {
  constructor(
    @Inject(ListFriendsUseCase) private listFriendsUseCase: ListFriendsUseCase,
    @Inject(RequestFriendshipUseCase) private requestFriendshipUseCase: RequestFriendshipUseCase,
    @Inject(AcceptFriendshipUseCase) private acceptFriendshipUseCase: AcceptFriendshipUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List accepted friends and pending requests' })
  @ApiOkResponse({ description: 'Friends retrieved successfully.', type: [FriendListItemResponseDto] })
  async list(@CurrentUser() currentUser: UserPayload) {
    const result = await this.listFriendsUseCase.execute({
      currentUserPublicId: currentUser.sub,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.friends;
  }

  @Post('/:userPublicId/request')
  @ApiOperation({ summary: 'Send a friend request' })
  @ApiParam({ name: 'userPublicId', type: String })
  @ApiCreatedResponse({ description: 'Friend request sent successfully.', type: FriendshipStatusResponseDto })
  async request(@CurrentUser() currentUser: UserPayload, @Param('userPublicId') userPublicId: string) {
    const result = await this.requestFriendshipUseCase.execute({
      currentUserPublicId: currentUser.sub,
      addresseePublicId: userPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return { status: result.value.status };
  }

  @Post('/:userPublicId/accept')
  @ApiOperation({ summary: 'Accept a friend request received from a user' })
  @ApiParam({ name: 'userPublicId', type: String })
  @ApiCreatedResponse({ description: 'Friend request accepted successfully.', type: FriendshipStatusResponseDto })
  async accept(@CurrentUser() currentUser: UserPayload, @Param('userPublicId') userPublicId: string) {
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
