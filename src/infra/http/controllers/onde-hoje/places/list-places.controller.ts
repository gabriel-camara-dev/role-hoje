import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ListPlacesUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-places';
import { Public } from '@/infra/auth/public';
import { PlacePresenter } from '@/infra/http/presenters/onde-hoje/place-presenter';
import { PlaceResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/place-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';
import { listPlacesQuerySchema, type ListPlacesQuery } from './place-schemas';

@ApiTags('Onde Hoje - Places')
@ApiBearerAuth()
@Controller('/places')
export class ListPlacesController {
  constructor(@Inject(ListPlacesUseCase) private listPlacesUseCase: ListPlacesUseCase) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List Google Maps places available for voting' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  @ApiOkResponse({ description: 'Places retrieved successfully.', type: [PlaceResponseDto] })
  async handle(@Query(new ZodValidationPipe<ListPlacesQuery>(listPlacesQuerySchema)) query: ListPlacesQuery) {
    const result = await this.listPlacesUseCase.execute(query);

    return result.value.places.map((place) => PlacePresenter.toHTTP(place));
  }
}
