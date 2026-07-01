import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetPlaceAttendanceEstimateUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-place-attendance-estimate';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { PlacePresenter } from '@/infra/http/presenters/onde-hoje/place-presenter';
import { PlaceAttendanceEstimateResponseDto } from '@/infra/http/swagger/presenter-schemas/onde-hoje/place-presenter-schema';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';
import { attendanceEstimateQuerySchema, type AttendanceEstimateQuery } from './place-schemas';

@ApiTags('Onde Hoje - Places')
@ApiBearerAuth()
@Controller('/places')
export class GetPlaceAttendanceEstimateController {
  constructor(
    @Inject(GetPlaceAttendanceEstimateUseCase)
    private getPlaceAttendanceEstimateUseCase: GetPlaceAttendanceEstimateUseCase,
  ) {}

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
  async handle(
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
}
