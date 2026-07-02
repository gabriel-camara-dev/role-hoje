import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ConflictError } from '../../errors/conflict-error';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';

interface RemoveGroupMemberUseCaseRequest {
  currentUserPublicId: string;
  groupPublicId: string;
  memberUsername: string;
}

type RemoveGroupMemberUseCaseResponse = Result<ResourceNotFoundError | ForbiddenError | ConflictError, { removed: true }>;

@Injectable()
export class RemoveGroupMemberUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: RemoveGroupMemberUseCaseRequest): Promise<RemoveGroupMemberUseCaseResponse> {
    const leader = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!leader) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const result = await this.groupsRepository.removeMember({
      leaderId: leader.id,
      groupPublicId: request.groupPublicId,
      memberUsername: request.memberUsername,
    });

    if (result.type === 'not_found') return fail(new ResourceNotFoundError('Group or member not found'));
    if (result.type === 'forbidden') return fail(new ForbiddenError('Only the group owner can remove members'));
    if (result.type !== 'removed') return fail(new ConflictError('Could not remove member'));

    return success({ removed: true });
  }
}
