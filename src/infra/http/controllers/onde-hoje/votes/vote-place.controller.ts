import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { VoteTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/vote-today';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import {
  VoteTodayBodyDto,
  VoteTodayResponseDto,
} from '@/infra/http/swagger/presenter-schemas/onde-hoje/map-presenter-schema';
import { parseDateOnly, todayDate } from '@/infra/http/schemas/onde-hoje/map/map-query-schemas';
import {
  legacyTodayVoteSchema,
  type LegacyTodayVoteBody,
  type VoteBody,
  voteSchema,
} from '@/infra/http/schemas/onde-hoje/votes/vote-schemas';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';

@ApiTags('Onde Hoje - Votes')
@ApiBearerAuth()
@Controller()
export class VotePlaceController {
  constructor(@Inject(VoteTodayUseCase) private voteTodayUseCase: VoteTodayUseCase) {}

  @Post('/places/:placePublicId/votes/today')
  @ApiOperation({ summary: 'Vote that a day should happen at this place' })
  @ApiParam({ name: 'placePublicId', type: String })
  @ApiBody({ type: VoteTodayBodyDto })
  @ApiCreatedResponse({ description: 'Vote registered successfully.', type: VoteTodayResponseDto })
  @ApiConflictResponse({ description: 'User reached the daily vote limit.' })
  async voteToday(
    @CurrentUser() currentUser: UserPayload,
    @Param('placePublicId') placePublicId: string,
    @Body(new ZodValidationPipe<LegacyTodayVoteBody>(legacyTodayVoteSchema)) body: LegacyTodayVoteBody,
  ) {
    return this.createVote(currentUser, placePublicId, { ...body, day: undefined });
  }

  @Post('/places/:placePublicId/votes')
  @ApiOperation({ summary: 'Vote for this place on a specific day' })
  @ApiParam({ name: 'placePublicId', type: String })
  @ApiBody({ type: VoteTodayBodyDto })
  @ApiCreatedResponse({ description: 'Vote registered successfully.', type: VoteTodayResponseDto })
  @ApiConflictResponse({ description: 'User reached the daily vote limit for the selected day.' })
  async voteForDay(
    @CurrentUser() currentUser: UserPayload,
    @Param('placePublicId') placePublicId: string,
    @Body(new ZodValidationPipe<VoteBody>(voteSchema)) body: VoteBody,
  ) {
    return this.createVote(currentUser, placePublicId, body);
  }

  private async createVote(currentUser: UserPayload, placePublicId: string, body: VoteBody) {
    const result = await this.voteTodayUseCase.execute({
      currentUserPublicId: currentUser.sub,
      placePublicId,
      day: parseDateOnly(body.day) ?? todayDate(),
      groupPublicId: body.groupPublicId,
      note: body.note,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.vote;
  }
}
