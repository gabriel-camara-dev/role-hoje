import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { PlaceAttendanceEstimate } from '../../../../enterprise/entities/onde-hoje/places/place-attendance-estimate';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface GetPlaceAttendanceEstimateUseCaseRequest {
  placePublicId: string;
  scheduledAt: Date;
  radiusKm?: number;
  groupPublicId?: string;
}

type GetPlaceAttendanceEstimateUseCaseResponse = Result<ResourceNotFoundError, { estimate: PlaceAttendanceEstimate }>;

@Injectable()
export class GetPlaceAttendanceEstimateUseCase {
  constructor(@Inject(PlacesRepository) private placesRepository: PlacesRepository) {}

  async execute(request: GetPlaceAttendanceEstimateUseCaseRequest): Promise<GetPlaceAttendanceEstimateUseCaseResponse> {
    const estimate = await this.placesRepository.attendanceEstimate({
      placePublicId: request.placePublicId,
      scheduledAt: request.scheduledAt,
      radiusKm: request.radiusKm ?? 1,
      groupPublicId: request.groupPublicId,
    });

    if (!estimate) {
      return fail(new ResourceNotFoundError('Place or group not found'));
    }

    return success({ estimate });
  }
}
