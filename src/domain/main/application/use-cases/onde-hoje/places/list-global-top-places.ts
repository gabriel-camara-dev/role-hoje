import { Inject, Injectable } from '@nestjs/common';
import { CacheRepository } from '@/infra/cache/cache-repository';
import { ondeHojeCacheKey, ondeHojeCachePrefixes, ondeHojeCacheTtl } from '@/infra/cache/onde-hoje-cache';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import type { TodayMapPlace } from '../../../../enterprise/entities/onde-hoje/places/today-map-place';
import { PlacesRepository, type GlobalTopPlacesQuery } from '../../../repositories/onde-hoje/places-repository';

type ListGlobalTopPlacesUseCaseResponse = Result<never, { places: TodayMapPlace[] }>;

@Injectable()
export class ListGlobalTopPlacesUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(CacheRepository) private cacheRepository: CacheRepository,
  ) {}

  async execute(query: GlobalTopPlacesQuery): Promise<ListGlobalTopPlacesUseCaseResponse> {
    const places = await this.cacheRepository.remember(
      ondeHojeCacheKey(ondeHojeCachePrefixes.globalRanking, {
        city: query.city,
        limit: query.limit,
        state: query.state,
      }),
      ondeHojeCacheTtl.globalRanking,
      () => this.placesRepository.globalTopPlaces(query),
    );

    return success({ places });
  }
}
