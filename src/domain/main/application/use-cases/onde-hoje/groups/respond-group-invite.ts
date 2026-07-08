import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ConflictError } from '../../errors/conflict-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import type { GroupMembership } from '../../../../enterprise/entities/onde-hoje/groups/group-membership';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';

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
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher,
  ) {}

  async execute(request: RespondGroupInviteUseCaseRequest): Promise<RespondGroupInviteUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const result = await this.groupsRepository.respondInvite({
      userId: user.id,
      groupPublicId: request.groupPublicId,
      action: request.action,
    });

    if (result.type === 'not_found') return fail(new ResourceNotFoundError('Group not found'));
    if (result.type === 'not_invited') return fail(new ConflictError('There is no pending invite for this group'));

    if (result.type === 'declined') {
      return success({ membership: null });
    }

    await this.notificationDispatcher.dispatch({
      recipientPublicId: result.ownerPublicId,
      actorPublicId: request.currentUserPublicId,
      type: 'GROUP_INVITE_ACCEPTED',
      title: `${result.memberName} entrou no grupo`,
      body: `${result.memberName} aceitou o convite para o grupo ${result.groupName}.`,
      data: { groupPublicId: result.membership.groupPublicId, groupName: result.groupName },
    });

    return success({ membership: result.membership });
  }
}
