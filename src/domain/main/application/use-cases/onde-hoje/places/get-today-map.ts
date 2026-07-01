import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import { type TodayMapQuery, PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { TodayMapPlace } from '../../../../enterprise/entities/onde-hoje/places/today-map-place';

type GetTodayMapUseCaseResponse = Result<never, { places: TodayMapPlace[] }>;

@Injectable()
export class GetTodayMapUseCase {
  constructor(@Inject(PlacesRepository) private placesRepository: PlacesRepository) {}

  async execute(query: TodayMapQuery): Promise<GetTodayMapUseCaseResponse> {
    const places = await this.placesRepository.todayMap(query);

    return success({ places });
  }
}
