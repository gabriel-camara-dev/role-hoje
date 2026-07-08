import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { GetTodayMapUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-today-map';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { MapPresenter } from '@/infra/http/presenters/onde-hoje/map-presenter';
import {
  parseDateOnly,
  todayDate,
  todayMapQuerySchema,
  type TodayMapQuery,
} from '@/infra/http/schemas/onde-hoje/map/map-query-schemas';
import { TodayMapPlaceResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/map-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';
import { OptionalViewerResolver } from './optional-viewer';

@ApiTags('Onde Hoje - Map')
@ApiBearerAuth()
@Controller()
export class GetTodayMapController {
  constructor(
    @Inject(GetTodayMapUseCase) private getTodayMapUseCase: GetTodayMapUseCase,
    @Inject(OptionalViewerResolver) private optionalViewerResolver: OptionalViewerResolver,
  ) {}

  @Get('/map/today')
  @Public()
  @ApiOperation({ summary: 'Show today votes grouped by map place' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'groupPublicId', required: false, type: String })
  @ApiQuery({ name: 'day', required: false, type: String, example: '2026-06-30' })
  @ApiOkResponse({ description: 'Today map retrieved successfully.', type: [TodayMapPlaceResponseDto] })
  async handle(
    @Req() request: Request,
    @Query(new ZodValidationPipe<TodayMapQuery>(todayMapQuerySchema)) query: TodayMapQuery,
  ) {
    const viewerPublicId = await this.optionalViewerResolver.getPublicId(request);
    const result = await this.getTodayMapUseCase.execute({
      city: query.city,
      groupPublicId: query.groupPublicId,
      day: parseDateOnly(query.day) ?? todayDate(),
      from: parseDateOnly(query.from) ?? undefined,
      to: parseDateOnly(query.to) ?? undefined,
      includeViewerGroups: query.myGroups === '1' || query.myGroups === 'true',
      viewerPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.places.map((place) =>
      MapPresenter.todayPlaceToHTTP(place, { includeVoters: Boolean(viewerPublicId) }),
    );
  }
}
