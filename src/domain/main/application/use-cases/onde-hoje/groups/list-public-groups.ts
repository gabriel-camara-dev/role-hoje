import { Inject, Injectable } from '@nestjs/common';
import { CacheRepository } from '@/infra/cache/cache-repository';
import { ondeHojeCacheKey, ondeHojeCachePrefixes, ondeHojeCacheTtl } from '@/infra/cache/onde-hoje-cache';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import { type ListPublicGroupsQuery, GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import type { Group } from '../../../../enterprise/entities/onde-hoje/groups/group';

type ListPublicGroupsUseCaseResponse = Result<never, { groups: Group[] }>;

@Injectable()
export class ListPublicGroupsUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(CacheRepository) private cacheRepository: CacheRepository,
  ) {}

  async execute(query: ListPublicGroupsQuery): Promise<ListPublicGroupsUseCaseResponse> {
    const groups = await this.cacheRepository.remember(
      ondeHojeCacheKey(ondeHojeCachePrefixes.publicGroups, {
        city: query.city,
      }),
      ondeHojeCacheTtl.publicGroups,
      () => this.groupsRepository.listPublic(query),
    );

    return success({ groups });
  }
}
