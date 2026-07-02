import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { ConflictError } from '../../errors/conflict-error';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import type { GroupMembership } from '../../../../enterprise/entities/onde-hoje/groups/group-membership';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';

interface AcceptGroupMemberUseCaseRequest {
  currentUserPublicId: string;
  groupPublicId: string;
  memberUsername: string;
}

type AcceptGroupMemberUseCaseResponse = Result<
  ResourceNotFoundError | ForbiddenError | ConflictError,
  { membership: GroupMembership }
>;

@Injectable()
export class AcceptGroupMemberUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: AcceptGroupMemberUseCaseRequest): Promise<AcceptGroupMemberUseCaseResponse> {
    const leader = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!leader) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const result = await this.groupsRepository.acceptMember({
      leaderId: leader.id,
      groupPublicId: request.groupPublicId,
      memberUsername: request.memberUsername,
    });

    if (result.type === 'not_found') {
      return fail(new ResourceNotFoundError('Group or member request not found'));
    }

    if (result.type === 'forbidden') {
      return fail(new ForbiddenError('Only the group leader can accept members'));
    }

    if (result.type === 'not_pending') {
      return fail(new ConflictError('Member request is not pending'));
    }

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.group.member-accepted',
        aggregateId: request.groupPublicId,
        actorId: request.currentUserPublicId,
        payload: {
          groupId: request.groupPublicId,
          memberUsername: request.memberUsername,
          membershipStatus: result.membership.status,
        },
      }),
    );

    return success({ membership: result.membership });
  }
}
