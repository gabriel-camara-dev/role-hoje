import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { GetMapHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-map-history';
import { GetTodayMapUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-today-map';
import { ListMyVoteHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-my-vote-history';
import { ListTopPlacesTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-top-places-today';
import { VoteTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/vote-today';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { MapPresenter } from '@/infra/http/presenters/onde-hoje/map-presenter';
import { PlacePresenter } from '@/infra/http/presenters/onde-hoje/place-presenter';
import {
  MapHistoryDayResponseDto,
  TodayMapPlaceResponseDto,
  VoteTodayBodyDto,
  VoteTodayResponseDto,
} from '@/infra/http/swagger/presenter-schemas/onde-hoje/map-presenter-schema';
import { UserVoteHistoryItemResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/place-presenter-schema';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';

const voteSchema = z.object({
  groupPublicId: z.string().uuid().optional(),
  note: z.string().max(240).optional(),
});

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const historyQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    city: z.string().min(1).optional(),
    groupPublicId: z.string().uuid().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(100).optional(),
  })
  .refine((query) => query.radiusKm === undefined || (query.latitude !== undefined && query.longitude !== undefined), {
    message: 'latitude and longitude are required when radiusKm is provided',
    path: ['radiusKm'],
  })
  .refine(
    (query) => {
      const from = parseDateOnly(query.from) ?? addDays(todayDate(), -6);
      const to = parseDateOnly(query.to) ?? todayDate();

      return from <= to && daysBetween(from, to) <= 31;
    },
    {
      message: 'Date range must be ordered and have at most 31 days',
      path: ['to'],
    },
  );

const myVotesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const topPlacesQuerySchema = z.object({
  city: z.string().min(1).optional(),
  groupPublicId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

type VoteBody = z.infer<typeof voteSchema>;
type HistoryQuery = z.infer<typeof historyQuerySchema>;
type MyVotesQuery = z.infer<typeof myVotesQuerySchema>;
type TopPlacesQuery = z.infer<typeof topPlacesQuerySchema>;

@ApiTags('Onde Hoje - Map')
@ApiBearerAuth()
@Controller()
export class TodayMapController {
  constructor(
    @Inject(GetTodayMapUseCase) private getTodayMapUseCase: GetTodayMapUseCase,
    @Inject(GetMapHistoryUseCase) private getMapHistoryUseCase: GetMapHistoryUseCase,
    @Inject(ListMyVoteHistoryUseCase) private listMyVoteHistoryUseCase: ListMyVoteHistoryUseCase,
    @Inject(ListTopPlacesTodayUseCase) private listTopPlacesTodayUseCase: ListTopPlacesTodayUseCase,
    @Inject(VoteTodayUseCase) private voteTodayUseCase: VoteTodayUseCase,
  ) {}

  @Get('/map/today')
  @Public()
  @ApiOperation({ summary: 'Show today votes grouped by map place' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'groupPublicId', required: false, type: String })
  @ApiOkResponse({ description: 'Today map retrieved successfully.', type: [TodayMapPlaceResponseDto] })
  async today(@Query('city') city?: string, @Query('groupPublicId') groupPublicId?: string) {
    const result = await this.getTodayMapUseCase.execute({ city, groupPublicId });

    return result.value.places.map((place) => MapPresenter.todayPlaceToHTTP(place));
  }

  @Get('/map/top-places')
  @Public()
  @ApiOperation({ summary: 'List today top voted places by city and public or group scope' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'groupPublicId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ description: 'Top places retrieved successfully.', type: [TodayMapPlaceResponseDto] })
  async topPlaces(@Query(new ZodValidationPipe<TopPlacesQuery>(topPlacesQuerySchema)) query: TopPlacesQuery) {
    const result = await this.listTopPlacesTodayUseCase.execute(query);

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.places.map((place) => MapPresenter.todayPlaceToHTTP(place));
  }

  @Get('/map/history')
  @Public()
  @ApiOperation({ summary: 'Show past votes grouped by day and place' })
  @ApiQuery({ name: 'from', required: false, type: String, example: '2026-06-01' })
  @ApiQuery({ name: 'to', required: false, type: String, example: '2026-06-30' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'groupPublicId', required: false, type: String })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  @ApiOkResponse({ description: 'Map history retrieved successfully.', type: [MapHistoryDayResponseDto] })
  async history(@Query(new ZodValidationPipe<HistoryQuery>(historyQuerySchema)) query: HistoryQuery) {
    const result = await this.getMapHistoryUseCase.execute({
      ...query,
      from: parseDateOnly(query.from) ?? addDays(todayDate(), -6),
      to: parseDateOnly(query.to) ?? todayDate(),
    });

    return result.value.history.map((historyDay) => MapPresenter.historyDayToHTTP(historyDay));
  }

  @Get('/me/votes')
  @ApiOperation({ summary: 'List places voted by the authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 30 })
  @ApiOkResponse({ description: 'User vote history retrieved successfully.', type: [UserVoteHistoryItemResponseDto] })
  async myVotes(
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

  @Post('/places/:placePublicId/votes/today')
  @ApiOperation({ summary: 'Vote that today should happen at this place' })
  @ApiParam({ name: 'placePublicId', type: String })
  @ApiBody({ type: VoteTodayBodyDto })
  @ApiCreatedResponse({ description: 'Vote registered successfully.', type: VoteTodayResponseDto })
  @ApiConflictResponse({ description: 'User reached the daily vote limit.' })
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

function parseDateOnly(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function todayDate() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);

  return copy;
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
}
