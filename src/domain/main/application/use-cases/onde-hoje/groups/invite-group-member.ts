import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ConflictError } from '../../errors/conflict-error';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import type { GroupMembership } from '../../../../enterprise/entities/onde-hoje/groups/group-membership';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';

interface InviteGroupMemberUseCaseRequest {
  currentUserPublicId: string;
  groupPublicId: string;
  memberUsername: string;
}

type InviteGroupMemberUseCaseResponse = Result<
  ResourceNotFoundError | ForbiddenError | ConflictError,
  { membership: GroupMembership }
>;

@Injectable()
export class InviteGroupMemberUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher,
  ) {}

  async execute(request: InviteGroupMemberUseCaseRequest): Promise<InviteGroupMemberUseCaseResponse> {
    const leader = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!leader) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const result = await this.groupsRepository.inviteMember({
      leaderId: leader.id,
      groupPublicId: request.groupPublicId,
      memberUsername: request.memberUsername,
    });

    if (result.type === 'not_found') return fail(new ResourceNotFoundError('Group or user not found'));
    if (result.type === 'forbidden') return fail(new ForbiddenError('Only active group members can invite'));
    if (result.type === 'already_member') return fail(new ConflictError('User is already part of this group'));

    await this.notificationDispatcher.dispatch({
      recipientPublicId: result.invitedUserPublicId,
      actorPublicId: request.currentUserPublicId,
      type: 'GROUP_INVITE',
      title: `Convite para o grupo ${result.groupName}`,
      body: 'Toque para aceitar ou recusar o convite.',
      data: { groupPublicId: result.membership.groupPublicId, groupName: result.groupName },
    });

    return success({ membership: result.membership });
  }
}
