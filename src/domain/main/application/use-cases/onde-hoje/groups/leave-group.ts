import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface LeaveGroupUseCaseRequest {
  currentUserPublicId: string;
  groupPublicId: string;
}

type LeaveGroupUseCaseResponse = Result<ResourceNotFoundError, { left: true; groupDeleted: boolean }>;

@Injectable()
export class LeaveGroupUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: LeaveGroupUseCaseRequest): Promise<LeaveGroupUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const result = await this.groupsRepository.leave({
      userId: user.id,
      groupPublicId: request.groupPublicId,
    });

    if (result.type === 'not_found') {
      return fail(new ResourceNotFoundError('Group membership not found'));
    }

    return success({ left: true, groupDeleted: result.type === 'deleted' });
  }
}
