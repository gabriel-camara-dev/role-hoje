import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { GetTodayMapUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-today-map';
import { VoteTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/vote-today';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { OndeHojePresenter } from '@/infra/http/presenters/onde-hoje-presenter';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';

const voteSchema = z.object({
  groupPublicId: z.string().uuid().optional(),
  note: z.string().max(240).optional(),
});

type VoteBody = z.infer<typeof voteSchema>;

@ApiTags('Onde Hoje - Map')
@ApiBearerAuth()
@Controller()
export class TodayMapController {
  constructor(
    @Inject(GetTodayMapUseCase) private getTodayMapUseCase: GetTodayMapUseCase,
    @Inject(VoteTodayUseCase) private voteTodayUseCase: VoteTodayUseCase,
  ) {}

  @Get('/map/today')
  @Public()
  @ApiOperation({ summary: 'Show today votes grouped by map place' })
  async today(@Query('city') city?: string, @Query('groupPublicId') groupPublicId?: string) {
    const result = await this.getTodayMapUseCase.execute({ city, groupPublicId });

    return result.value.places.map((place) => OndeHojePresenter.todayMapPlaceToHTTP(place));
  }

  @Post('/places/:placePublicId/votes/today')
  @ApiOperation({ summary: 'Vote that today should happen at this place' })
  async voteToday(
    @CurrentUser() currentUser: UserPayload,
    @Param('placePublicId') placePublicId: string,
    @Body(new ZodValidationPipe<VoteBody>(voteSchema)) body: VoteBody,
  ) {
    const result = await this.voteTodayUseCase.execute({
      currentUserPublicId: currentUser.sub,
      placePublicId,
      ...body,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.vote;
  }
}
