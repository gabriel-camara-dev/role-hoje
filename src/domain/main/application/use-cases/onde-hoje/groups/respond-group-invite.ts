import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { GroupMembership } from '../../../../enterprise/entities/onde-hoje/groups/group-membership';
import { GroupMembersRepository } from '../../../repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ConflictError } from '../../errors/conflict-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface RespondGroupInviteUseCaseRequest {
  currentUserPublicId: string;
  groupPublicId: string;
  action: 'accept' | 'decline';
}

type RespondGroupInviteUseCaseResponse = Result<
  ResourceNotFoundError | ConflictError,
  { membership: GroupMembership | null }
>;

@Injectable()
export class RespondGroupInviteUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(GroupMembersRepository) private groupMembersRepository: GroupMembersRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: RespondGroupInviteUseCaseRequest): Promise<RespondGroupInviteUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const group = await this.groupsRepository.findById(request.groupPublicId);

    if (!group) {
      return fail(new ResourceNotFoundError('Group not found'));
    }

    const membership = await this.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: user.publicId,
    });

    if (membership?.status !== 'INVITED') {
      return fail(new ConflictError('There is no pending invite for this group'));
    }

    if (request.action === 'decline') {
      await this.groupMembersRepository.delete(membership);

      return success({ membership: null });
    }

    // Raises GroupInviteAcceptedEvent; OnGroupInviteAccepted notifies the owner.
    membership.acceptInvite();

    await this.groupMembersRepository.save(membership);

    return success({ membership: { groupPublicId: group.id.toString(), status: membership.status } });
  }
}
