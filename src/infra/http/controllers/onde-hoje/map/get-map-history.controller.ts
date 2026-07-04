import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { GetMapHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-map-history';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { MapPresenter } from '@/infra/http/presenters/onde-hoje/map-presenter';
import {
  addDays,
  historyQuerySchema,
  parseDateOnly,
  todayDate,
  type HistoryQuery,
} from '@/infra/http/schemas/onde-hoje/map/map-query-schemas';
import { MapHistoryDayResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/map-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';
import { OptionalViewerResolver } from './optional-viewer';

@ApiTags('Onde Hoje - Map')
@ApiBearerAuth()
@Controller()
export class GetMapHistoryController {
  constructor(
    @Inject(GetMapHistoryUseCase) private getMapHistoryUseCase: GetMapHistoryUseCase,
    @Inject(OptionalViewerResolver) private optionalViewerResolver: OptionalViewerResolver,
  ) {}

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
  async handle(
    @Req() request: Request,
    @Query(new ZodValidationPipe<HistoryQuery>(historyQuerySchema)) query: HistoryQuery,
  ) {
    const viewerPublicId = await this.optionalViewerResolver.getPublicId(request);
    const result = await this.getMapHistoryUseCase.execute({
      ...query,
      from: parseDateOnly(query.from) ?? addDays(todayDate(), -6),
      to: parseDateOnly(query.to) ?? todayDate(),
      viewerPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.history.map((historyDay) => ({
      ...historyDay,
      places: historyDay.places.map((place) =>
        MapPresenter.todayPlaceToHTTP(place, { includeVoters: Boolean(viewerPublicId) }),
      ),
    }));
  }
}
