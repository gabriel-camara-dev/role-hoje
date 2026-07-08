import { Inject, Injectable } from '@nestjs/common';
import type { TodayMapPlace } from '../../../../enterprise/entities/onde-hoje/places/today-map-place';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';

interface GetMapPlaceUseCaseRequest {
  placePublicId: string;
  day?: Date;
  groupPublicId?: string;
  viewerPublicId?: string;
}

@Injectable()
export class GetMapPlaceUseCase {
  constructor(@Inject(PlacesRepository) private placesRepository: PlacesRepository) {}

  async execute(request: GetMapPlaceUseCaseRequest): Promise<TodayMapPlace | null> {
    return this.placesRepository.mapPlaceByPublicId(request);
  }
}
