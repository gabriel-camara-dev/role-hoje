import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { createIntegrationEvent } from '@/core/events/integration-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { PasswordHasher } from '@/domain/main/application/use-cases/users/password-hasher';
import type { Group } from '../../../../enterprise/entities/onde-hoje/groups/group';
import { GroupMember } from '../../../../enterprise/entities/onde-hoje/groups/group-member';
import type { GroupMembership } from '../../../../enterprise/entities/onde-hoje/groups/group-membership';
import { GroupMembersRepository } from '../../../repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ConflictError } from '../../errors/conflict-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

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
    @Inject(GroupMembersRepository) private groupMembersRepository: GroupMembersRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(PasswordHasher) private passwordHasher: PasswordHasher,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: JoinGroupUseCaseRequest): Promise<JoinGroupUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const group = await this.findGroup(request);

    if (!group) {
      return fail(new ResourceNotFoundError('Group not found'));
    }

    const existing = await this.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: user.publicId,
    });

    if (existing?.status === 'BLOCKED') {
      return fail(new ConflictError('Blocked members cannot rejoin without moderator action'));
    }

    // Public groups let anyone in; a private group only does so on the right
    // password, otherwise the request waits for the owner's approval.
    const admitted = await this.canEnterRightAway(group, request.password);
    const membership =
      existing ?? GroupMember.create({ groupId: group.id, memberId: new UniqueEntityID(user.publicId) });

    // A pending request raises GroupJoinRequestedEvent; OnGroupJoinRequested
    // notifies the owner. Admitting straight away carries no notification.
    if (admitted) {
      membership.activate();
    } else {
      membership.requestToJoin();
    }

    if (existing) {
      await this.groupMembersRepository.save(membership);
    } else {
      await this.groupMembersRepository.create(membership);
    }

    await this.eventBus.publish(
      createIntegrationEvent({
        eventName: 'onde-hoje.group.member-joined',
        aggregateId: request.groupPublicId ?? request.name ?? 'unknown-group',
        actorId: request.currentUserPublicId,
        payload: {
          groupId: group.id.toString(),
          userId: request.currentUserPublicId,
          membershipStatus: membership.status,
        },
        recipientIds: [request.currentUserPublicId],
      }),
    );

    return success({ membership: { groupPublicId: group.id.toString(), status: membership.status } });
  }

  private async findGroup(request: JoinGroupUseCaseRequest): Promise<Group | null> {
    if (request.groupPublicId) {
      return this.groupsRepository.findById(request.groupPublicId);
    }

    if (request.name) {
      return this.groupsRepository.findByName(request.name);
    }

    return null;
  }

  private async canEnterRightAway(group: Group, password?: string): Promise<boolean> {
    if (group.isPublic) {
      return true;
    }

    if (!group.passwordHash || !password) {
      return false;
    }

    return this.passwordHasher.compare(password, group.passwordHash);
  }
}
