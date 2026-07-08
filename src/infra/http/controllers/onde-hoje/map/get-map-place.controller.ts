import { Controller, Get, Inject, NotFoundException, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { GetMapPlaceUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-map-place';
import { Public } from '@/infra/auth/public';
import { MapPresenter } from '@/infra/http/presenters/onde-hoje/map-presenter';
import { parseDateOnly, todayDate } from '@/infra/http/schemas/onde-hoje/map/map-query-schemas';
import { TodayMapPlaceResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/map-presenter-schema';
import { OptionalViewerResolver } from './optional-viewer';

@ApiTags('Onde Hoje - Map')
@ApiBearerAuth()
@Controller()
export class GetMapPlaceController {
  constructor(
    @Inject(GetMapPlaceUseCase) private getMapPlaceUseCase: GetMapPlaceUseCase,
    @Inject(OptionalViewerResolver) private optionalViewerResolver: OptionalViewerResolver,
  ) {}

  @Get('/map/places/:placePublicId')
  @Public()
  @ApiOperation({ summary: 'Get a single place map card by its public id (for shareable vote links)' })
  @ApiParam({ name: 'placePublicId', type: String })
  @ApiQuery({ name: 'day', required: false, type: String })
  @ApiQuery({ name: 'groupPublicId', required: false, type: String })
  @ApiOkResponse({ description: 'Place retrieved successfully.', type: TodayMapPlaceResponseDto })
  async handle(
    @Req() request: Request,
    @Param('placePublicId') placePublicId: string,
    @Query('day') day?: string,
    @Query('groupPublicId') groupPublicId?: string,
  ) {
    const viewerPublicId = await this.optionalViewerResolver.getPublicId(request);
    const place = await this.getMapPlaceUseCase.execute({
      placePublicId,
      day: parseDateOnly(day) ?? todayDate(),
      groupPublicId,
      viewerPublicId,
    });

    if (!place) {
      throw new NotFoundException('Place not found');
    }

    return MapPresenter.todayPlaceToHTTP(place, { includeVoters: Boolean(viewerPublicId) });
  }
}
