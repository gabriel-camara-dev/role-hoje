import { Inject, Injectable } from '@nestjs/common';
import { CacheRepository } from '@/infra/cache/cache-repository';
import { ondeHojeCacheKey, ondeHojeCachePrefixes, ondeHojeCacheTtl } from '@/infra/cache/onde-hoje-cache';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { type TodayMapQuery, PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { TodayMapPlace } from '../../../../enterprise/entities/onde-hoje/places/today-map-place';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

type GetTodayMapUseCaseResponse = Result<ResourceNotFoundError, { places: TodayMapPlace[] }>;

@Injectable()
export class GetTodayMapUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(CacheRepository) private cacheRepository: CacheRepository,
  ) {}

  async execute(query: TodayMapQuery): Promise<GetTodayMapUseCaseResponse> {
    const places = await this.cacheRepository.remember(
      ondeHojeCacheKey(ondeHojeCachePrefixes.todayMap, {
        city: query.city,
        day: query.day,
        groupPublicId: query.groupPublicId,
        viewerPublicId: query.viewerPublicId,
      }),
      ondeHojeCacheTtl.todayMap,
      () => this.placesRepository.todayMap(query),
    );

    if (!places) {
      return fail(new ResourceNotFoundError('Group not found'));
    }

    return success({ places });
  }
}
