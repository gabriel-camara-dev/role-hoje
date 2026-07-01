import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ListTopPlacesTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-top-places-today';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { MapPresenter } from '@/infra/http/presenters/onde-hoje/map-presenter';
import { TodayMapPlaceResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/map-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';
import { parseDateOnly, todayDate, topPlacesQuerySchema, type TopPlacesQuery } from './map-query-schemas';
import { OptionalViewerResolver } from './optional-viewer';

@ApiTags('Onde Hoje - Map')
@ApiBearerAuth()
@Controller()
export class ListTopPlacesController {
  constructor(
    @Inject(ListTopPlacesTodayUseCase) private listTopPlacesTodayUseCase: ListTopPlacesTodayUseCase,
    @Inject(OptionalViewerResolver) private optionalViewerResolver: OptionalViewerResolver,
  ) {}

  @Get('/map/top-places')
  @Public()
  @ApiOperation({ summary: 'List today top voted places by city and public or group scope' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'groupPublicId', required: false, type: String })
  @ApiQuery({ name: 'day', required: false, type: String, example: '2026-06-30' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ description: 'Top places retrieved successfully.', type: [TodayMapPlaceResponseDto] })
  async handle(
    @Req() request: Request,
    @Query(new ZodValidationPipe<TopPlacesQuery>(topPlacesQuerySchema)) query: TopPlacesQuery,
  ) {
    const result = await this.listTopPlacesTodayUseCase.execute({
      ...query,
      day: parseDateOnly(query.day) ?? todayDate(),
      viewerPublicId: await this.optionalViewerResolver.getPublicId(request),
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.places.map((place) => MapPresenter.todayPlaceToHTTP(place));
  }
}
