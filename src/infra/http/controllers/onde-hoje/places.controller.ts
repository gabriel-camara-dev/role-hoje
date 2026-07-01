import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { GetPlaceAttendanceEstimateUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-place-attendance-estimate';
import { ListPlacesUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-places';
import { UpsertPlaceUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/upsert-place';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { PlacePresenter } from '@/infra/http/presenters/onde-hoje/place-presenter';
import {
  CreatePlaceBodyDto,
  PlaceAttendanceEstimateResponseDto,
  PlaceResponseDto,
} from '@/infra/http/swagger/presenter-schemas/onde-hoje/place-presenter-schema';
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

const listPlacesQuerySchema = z
  .object({
    q: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(100).optional(),
  })
  .refine((query) => query.radiusKm === undefined || (query.latitude !== undefined && query.longitude !== undefined), {
    message: 'latitude and longitude are required when radiusKm is provided',
    path: ['radiusKm'],
  });

const attendanceEstimateQuerySchema = z.object({
  scheduledAt: z.coerce.date(),
  radiusKm: z.coerce.number().positive().max(100).default(1),
  groupPublicId: z.string().uuid().optional(),
});

type CreatePlaceBody = z.infer<typeof createPlaceSchema>;
type ListPlacesQuery = z.infer<typeof listPlacesQuerySchema>;
type AttendanceEstimateQuery = z.infer<typeof attendanceEstimateQuerySchema>;

@ApiTags('Onde Hoje - Places')
@ApiBearerAuth()
@Controller('/places')
export class PlacesController {
  constructor(
    @Inject(ListPlacesUseCase) private listPlacesUseCase: ListPlacesUseCase,
    @Inject(UpsertPlaceUseCase) private upsertPlaceUseCase: UpsertPlaceUseCase,
    @Inject(GetPlaceAttendanceEstimateUseCase)
    private getPlaceAttendanceEstimateUseCase: GetPlaceAttendanceEstimateUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List Google Maps places available for voting' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  @ApiOkResponse({ description: 'Places retrieved successfully.', type: [PlaceResponseDto] })
  async list(@Query(new ZodValidationPipe<ListPlacesQuery>(listPlacesQuerySchema)) query: ListPlacesQuery) {
    const result = await this.listPlacesUseCase.execute(query);

    return result.value.places.map((place) => PlacePresenter.toHTTP(place));
  }

  @Get('/:placePublicId/attendance/estimate')
  @Public()
  @ApiOperation({ summary: 'Estimate how many people are near a place at a scheduled time' })
  @ApiParam({ name: 'placePublicId', type: String })
  @ApiQuery({ name: 'scheduledAt', required: true, type: Date })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'groupPublicId', required: false, type: String })
  @ApiOkResponse({
    description: 'Attendance estimate retrieved successfully.',
    type: PlaceAttendanceEstimateResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Place or group not found.' })
  async attendanceEstimate(
    @Param('placePublicId') placePublicId: string,
    @Query(new ZodValidationPipe<AttendanceEstimateQuery>(attendanceEstimateQuerySchema))
    query: AttendanceEstimateQuery,
  ) {
    const result = await this.getPlaceAttendanceEstimateUseCase.execute({
      placePublicId,
      scheduledAt: query.scheduledAt,
      radiusKm: query.radiusKm,
      groupPublicId: query.groupPublicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return PlacePresenter.attendanceEstimateToHTTP(result.value.estimate);
  }

  @Post()
  @ApiOperation({ summary: 'Register or update a Google Maps place' })
  @ApiBody({ type: CreatePlaceBodyDto })
  @ApiCreatedResponse({ description: 'Place registered or updated successfully.', type: PlaceResponseDto })
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

    return PlacePresenter.toHTTP(result.value.place);
  }
}
