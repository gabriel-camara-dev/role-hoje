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

interface JoinGroupUseCaseRequest {
  currentUserPublicId: string;
  groupPublicId: string;
}

type JoinGroupUseCaseResponse = Result<ResourceNotFoundError | ConflictError, { membership: GroupMembership }>;

@Injectable()
export class JoinGroupUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: JoinGroupUseCaseRequest): Promise<JoinGroupUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const joinResult = await this.groupsRepository.join({
      userId: user.id,
      groupPublicId: request.groupPublicId,
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
        aggregateId: request.groupPublicId,
        actorId: request.currentUserPublicId,
        payload: {
          groupId: request.groupPublicId,
          userId: request.currentUserPublicId,
          membershipStatus: membership.status,
        },
        recipientIds: [request.currentUserPublicId],
      }),
    );

    return success({ membership });
  }
}
