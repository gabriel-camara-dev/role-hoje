import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ListGlobalTopPlacesUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-global-top-places';
import { ListTopPlacesTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-top-places-today';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { MapPresenter } from '@/infra/http/presenters/onde-hoje/map-presenter';
import {
  parseDateOnly,
  globalTopPlacesQuerySchema,
  type GlobalTopPlacesQuery,
  todayDate,
  topPlacesQuerySchema,
  type TopPlacesQuery,
} from '@/infra/http/schemas/onde-hoje/map/map-query-schemas';
import { TodayMapPlaceResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/map-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';
import { OptionalViewerResolver } from './optional-viewer';

@ApiTags('Onde Hoje - Map')
@ApiBearerAuth()
@Controller()
export class ListTopPlacesController {
  constructor(
    @Inject(ListGlobalTopPlacesUseCase) private listGlobalTopPlacesUseCase: ListGlobalTopPlacesUseCase,
    @Inject(ListTopPlacesTodayUseCase) private listTopPlacesTodayUseCase: ListTopPlacesTodayUseCase,
    @Inject(OptionalViewerResolver) private optionalViewerResolver: OptionalViewerResolver,
  ) {}

  @Get('/map/top-places')
  @Public()
  @ApiOperation({ summary: 'List today top voted places by city and public or group scope' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'groupPublicId', required: false, type: String })
  @ApiQuery({ name: 'day', required: false, type: String, example: '2026-06-30' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 3 })
  @ApiOkResponse({ description: 'Top places retrieved successfully.', type: [TodayMapPlaceResponseDto] })
  async handle(
    @Req() request: Request,
    @Query(new ZodValidationPipe<TopPlacesQuery>(topPlacesQuerySchema)) query: TopPlacesQuery,
  ) {
    const viewerPublicId = await this.optionalViewerResolver.getPublicId(request);
    const result = await this.listTopPlacesTodayUseCase.execute({
      ...query,
      day: parseDateOnly(query.day) ?? todayDate(),
      viewerPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.places.map((place) =>
      MapPresenter.todayPlaceToHTTP(place, { includeVoters: Boolean(viewerPublicId) }),
    );
  }

  @Get('/map/global-ranking')
  @Public()
  @ApiOperation({ summary: 'List all-time top voted places by city or state' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiOkResponse({ description: 'Global ranking retrieved successfully.', type: [TodayMapPlaceResponseDto] })
  async globalRanking(
    @Query(new ZodValidationPipe<GlobalTopPlacesQuery>(globalTopPlacesQuerySchema)) query: GlobalTopPlacesQuery,
  ) {
    const result = await this.listGlobalTopPlacesUseCase.execute(query);

    return result.value.places.map((place) => MapPresenter.todayPlaceToHTTP(place));
  }
}
