import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ListPlacesUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-places';
import { UpsertPlaceUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/upsert-place';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { OndeHojePresenter } from '@/infra/http/presenters/onde-hoje-presenter';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';

const createPlaceSchema = z.object({
  googlePlaceId: z.string().min(1),
  name: z.string().min(2),
  formattedAddress: z.string().min(3),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  photoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  mapsUrl: z.string().url().optional(),
});

type CreatePlaceBody = z.infer<typeof createPlaceSchema>;

@ApiTags('Onde Hoje - Places')
@ApiBearerAuth()
@Controller('/places')
export class PlacesController {
  constructor(
    @Inject(ListPlacesUseCase) private listPlacesUseCase: ListPlacesUseCase,
    @Inject(UpsertPlaceUseCase) private upsertPlaceUseCase: UpsertPlaceUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List Google Maps places available for voting' })
  async list(@Query('q') q?: string, @Query('city') city?: string) {
    const result = await this.listPlacesUseCase.execute({ q, city });

    return result.value.places.map((place) => OndeHojePresenter.placeToHTTP(place));
  }

  @Post()
  @ApiOperation({ summary: 'Register or update a Google Maps place' })
  async create(
    @CurrentUser() currentUser: UserPayload,
    @Body(new ZodValidationPipe<CreatePlaceBody>(createPlaceSchema)) body: CreatePlaceBody,
  ) {
    const result = await this.upsertPlaceUseCase.execute({
      currentUserPublicId: currentUser.sub,
      ...body,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return OndeHojePresenter.placeToHTTP(result.value.place);
  }
}
