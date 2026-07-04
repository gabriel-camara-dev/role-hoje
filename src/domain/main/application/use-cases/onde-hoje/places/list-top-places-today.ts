import { Inject, Injectable } from '@nestjs/common';
import { CacheRepository } from '@/infra/cache/cache-repository';
import { ondeHojeCacheKey, ondeHojeCachePrefixes, ondeHojeCacheTtl } from '@/infra/cache/onde-hoje-cache';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { TodayMapPlace } from '../../../../enterprise/entities/onde-hoje/places/today-map-place';
import { PlacesRepository, type TopPlacesTodayQuery } from '../../../repositories/onde-hoje/places-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

type ListTopPlacesTodayUseCaseResponse = Result<ResourceNotFoundError, { places: TodayMapPlace[] }>;

@Injectable()
export class ListTopPlacesTodayUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(CacheRepository) private cacheRepository: CacheRepository,
  ) {}

  async execute(query: TopPlacesTodayQuery): Promise<ListTopPlacesTodayUseCaseResponse> {
    const places = await this.cacheRepository.remember(
      ondeHojeCacheKey(ondeHojeCachePrefixes.topPlaces, {
        city: query.city,
        day: query.day,
        groupPublicId: query.groupPublicId,
        limit: query.limit,
        state: query.state,
        viewerPublicId: query.viewerPublicId,
      }),
      ondeHojeCacheTtl.topPlaces,
      () => this.placesRepository.topPlacesToday(query),
    );

    if (!places) {
      return fail(new ResourceNotFoundError('Group not found'));
    }

    return success({ places });
  }
}
