import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { MyGroupItem } from '../../../repositories/onde-hoje/groups-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface ListMyGroupsUseCaseRequest {
  currentUserPublicId: string;
}

type ListMyGroupsUseCaseResponse = Result<ResourceNotFoundError, { groups: MyGroupItem[] }>;

@Injectable()
export class ListMyGroupsUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: ListMyGroupsUseCaseRequest): Promise<ListMyGroupsUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const groups = await this.groupsRepository.listMine(user.id);

    return success({ groups });
  }
}
