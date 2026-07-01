import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { TodayMapPlace } from '../../../../enterprise/entities/onde-hoje/places/today-map-place';
import { PlacesRepository, type TopPlacesTodayQuery } from '../../../repositories/onde-hoje/places-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

type ListTopPlacesTodayUseCaseResponse = Result<ResourceNotFoundError, { places: TodayMapPlace[] }>;

@Injectable()
export class ListTopPlacesTodayUseCase {
  constructor(@Inject(PlacesRepository) private placesRepository: PlacesRepository) {}

  async execute(query: TopPlacesTodayQuery): Promise<ListTopPlacesTodayUseCaseResponse> {
    const places = await this.placesRepository.topPlacesToday(query);

    if (!places) {
      return fail(new ResourceNotFoundError('Group not found'));
    }

    return success({ places });
  }
}
