import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { GroupMembersRepository } from '../../../repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface RemoveGroupMemberUseCaseRequest {
  currentUserPublicId: string;
  groupPublicId: string;
  memberUsername: string;
}

type RemoveGroupMemberUseCaseResponse = Result<ResourceNotFoundError | ForbiddenError, { removed: true }>;

@Injectable()
export class RemoveGroupMemberUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(GroupMembersRepository) private groupMembersRepository: GroupMembersRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: RemoveGroupMemberUseCaseRequest): Promise<RemoveGroupMemberUseCaseResponse> {
    const leader = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!leader) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const [group, memberUser] = await Promise.all([
      this.groupsRepository.findById(request.groupPublicId),
      this.usersRepository.findByUsername(request.memberUsername),
    ]);

    if (!group || !memberUser) {
      return fail(new ResourceNotFoundError('Group or member not found'));
    }

    const leadership = await this.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: leader.publicId,
    });

    if (!leadership?.leads) {
      return fail(new ForbiddenError('Only the group owner can remove members'));
    }

    // The owner leaves through `leave`, which hands the group over first.
    if (memberUser.publicId === leader.publicId) {
      return fail(new ForbiddenError('Only the group owner can remove members'));
    }

    const membership = await this.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: memberUser.publicId,
    });

    if (!membership) {
      return fail(new ResourceNotFoundError('Group or member not found'));
    }

    await this.groupMembersRepository.delete(membership);

    return success({ removed: true });
  }
}
