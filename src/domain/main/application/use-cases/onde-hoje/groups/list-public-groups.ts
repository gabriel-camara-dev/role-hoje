import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import type { GroupSummary } from '../../../../enterprise/entities/onde-hoje/groups/value-objects/group-summary';
import { type ListPublicGroupsQuery, GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';

type ListPublicGroupsUseCaseResponse = Result<never, { groups: GroupSummary[] }>;

@Injectable()
export class ListPublicGroupsUseCase {
  constructor(@Inject(GroupsRepository) private groupsRepository: GroupsRepository) {}

  async execute(query: ListPublicGroupsQuery): Promise<ListPublicGroupsUseCaseResponse> {
    const groups = await this.groupsRepository.findManyPublicSummaries(query);

    return success({ groups });
  }
}
