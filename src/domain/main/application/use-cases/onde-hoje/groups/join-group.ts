import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import type { GroupMembership } from '../../../../enterprise/entities/onde-hoje/groups/group-membership';
import { ConflictError } from '../../errors/conflict-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';

interface JoinGroupUseCaseRequest {
  currentUserPublicId: string;
  groupPublicId?: string;
  name?: string;
  password?: string;
}

type JoinGroupUseCaseResponse = Result<ResourceNotFoundError | ConflictError, { membership: GroupMembership }>;

@Injectable()
export class JoinGroupUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
    @Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher,
  ) {}

  async execute(request: JoinGroupUseCaseRequest): Promise<JoinGroupUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const joinResult = await this.groupsRepository.join({
      userId: user.id,
      groupPublicId: request.groupPublicId,
      name: request.name,
      password: request.password,
    });

    if (joinResult.type === 'not_found') {
      return fail(new ResourceNotFoundError('Group not found'));
    }

    if (joinResult.type === 'blocked') {
      return fail(new ConflictError('Blocked members cannot rejoin without moderator action'));
    }

    const { membership } = joinResult;

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.group.member-joined',
        aggregateId: request.groupPublicId ?? request.name ?? 'unknown-group',
        actorId: request.currentUserPublicId,
        payload: {
          groupId: membership.groupPublicId,
          userId: request.currentUserPublicId,
          membershipStatus: membership.status,
        },
        recipientIds: [request.currentUserPublicId],
      }),
    );

    // Private-group join requests wait for the owner's approval: notify them.
    if (membership.status === 'PENDING' && joinResult.ownerPublicId) {
      await this.notificationDispatcher.dispatch({
        recipientPublicId: joinResult.ownerPublicId,
        actorPublicId: request.currentUserPublicId,
        type: 'GROUP_JOIN_REQUEST',
        title: `Novo pedido de entrada em ${joinResult.groupName}`,
        body: 'Alguem pediu para entrar no seu grupo. Toque para revisar.',
        data: { groupPublicId: membership.groupPublicId, groupName: joinResult.groupName },
      });
    }

    return success({ membership });
  }
}
