import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ListMyVoteHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-my-vote-history';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { PlacePresenter } from '@/infra/http/presenters/onde-hoje/place-presenter';
import { UserVoteHistoryItemResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/place-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';
import { myVotesQuerySchema, type MyVotesQuery } from './vote-schemas';

@ApiTags('Onde Hoje - Votes')
@ApiBearerAuth()
@Controller()
export class ListMyVoteHistoryController {
  constructor(@Inject(ListMyVoteHistoryUseCase) private listMyVoteHistoryUseCase: ListMyVoteHistoryUseCase) {}

  @Get('/me/votes')
  @ApiOperation({ summary: 'List places voted by the authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 30 })
  @ApiOkResponse({ description: 'User vote history retrieved successfully.', type: [UserVoteHistoryItemResponseDto] })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Query(new ZodValidationPipe<MyVotesQuery>(myVotesQuerySchema)) query: MyVotesQuery,
  ) {
    const result = await this.listMyVoteHistoryUseCase.execute({
      currentUserPublicId: currentUser.sub,
      limit: query.limit,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.votes.map((vote) => PlacePresenter.userVoteHistoryToHTTP(vote));
  }
}
