import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { PublicGroupItem } from '../../../repositories/onde-hoje/groups-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface GetPublicGroupUseCaseRequest {
  groupPublicId: string;
}

type GetPublicGroupUseCaseResponse = Result<ResourceNotFoundError, { group: PublicGroupItem }>;

@Injectable()
export class GetPublicGroupUseCase {
  constructor(@Inject(GroupsRepository) private groupsRepository: GroupsRepository) {}

  async execute(request: GetPublicGroupUseCaseRequest): Promise<GetPublicGroupUseCaseResponse> {
    const group = await this.groupsRepository.getPublic(request.groupPublicId);

    if (!group) {
      return fail(new ResourceNotFoundError('Group not found'));
    }

    return success({ group });
  }
}
