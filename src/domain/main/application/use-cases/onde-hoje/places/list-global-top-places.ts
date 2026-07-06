import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import type { TodayMapPlace } from '../../../../enterprise/entities/onde-hoje/places/today-map-place';
import { PlacesRepository, type GlobalTopPlacesQuery } from '../../../repositories/onde-hoje/places-repository';

type ListGlobalTopPlacesUseCaseResponse = Result<never, { places: TodayMapPlace[] }>;

@Injectable()
export class ListGlobalTopPlacesUseCase {
  constructor(@Inject(PlacesRepository) private placesRepository: PlacesRepository) {}

  async execute(query: GlobalTopPlacesQuery): Promise<ListGlobalTopPlacesUseCaseResponse> {
    const places = await this.placesRepository.globalTopPlaces(query);

    return success({ places });
  }
}
