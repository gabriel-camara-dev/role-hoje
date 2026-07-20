import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { createIntegrationEvent } from '@/core/events/integration-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { GroupMembership } from '../../../../enterprise/entities/onde-hoje/groups/group-membership';
import { GroupMembersRepository } from '../../../repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ConflictError } from '../../errors/conflict-error';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

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
    @Inject(GroupMembersRepository) private groupMembersRepository: GroupMembersRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: AcceptGroupMemberUseCaseRequest): Promise<AcceptGroupMemberUseCaseResponse> {
    const leader = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!leader) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const [group, memberUser] = await Promise.all([
      this.groupsRepository.findById(request.groupPublicId),
      this.usersRepository.findByUsername(request.memberUsername),
    ]);

    if (!group || !memberUser) {
      return fail(new ResourceNotFoundError('Group or member request not found'));
    }

    const leadership = await this.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: leader.publicId,
    });

    if (!leadership?.leads) {
      return fail(new ForbiddenError('Only the group leader can accept members'));
    }

    const membership = await this.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: memberUser.publicId,
    });

    if (!membership) {
      return fail(new ResourceNotFoundError('Group or member request not found'));
    }

    if (membership.status !== 'PENDING') {
      return fail(new ConflictError('Member request is not pending'));
    }

    // Raises GroupMemberAcceptedEvent; OnGroupMemberAccepted notifies the member.
    membership.acceptRequest(new UniqueEntityID(leader.publicId));

    await this.groupMembersRepository.save(membership);

    await this.eventBus.publish(
      createIntegrationEvent({
        eventName: 'onde-hoje.group.member-accepted',
        aggregateId: request.groupPublicId,
        actorId: request.currentUserPublicId,
        payload: {
          groupId: request.groupPublicId,
          memberUsername: request.memberUsername,
          membershipStatus: membership.status,
        },
      }),
    );

    return success({ membership: { groupPublicId: group.id.toString(), status: membership.status } });
  }
}
