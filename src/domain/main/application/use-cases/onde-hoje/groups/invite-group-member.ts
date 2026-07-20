import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { GroupMember } from '../../../../enterprise/entities/onde-hoje/groups/group-member';
import type { GroupMembership } from '../../../../enterprise/entities/onde-hoje/groups/group-membership';
import { GroupMembersRepository } from '../../../repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ConflictError } from '../../errors/conflict-error';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

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
    @Inject(GroupMembersRepository) private groupMembersRepository: GroupMembersRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: InviteGroupMemberUseCaseRequest): Promise<InviteGroupMemberUseCaseResponse> {
    const inviter = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!inviter) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const [group, memberUser] = await Promise.all([
      this.groupsRepository.findById(request.groupPublicId),
      this.usersRepository.findByUsername(request.memberUsername),
    ]);

    if (!group || !memberUser) {
      return fail(new ResourceNotFoundError('Group or user not found'));
    }

    // Any active member can invite friends; the invite still needs acceptance.
    const inviterMembership = await this.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: inviter.publicId,
    });

    if (!inviterMembership?.isActive) {
      return fail(new ForbiddenError('Only active group members can invite'));
    }

    const existing = await this.groupMembersRepository.findByGroupAndMember({
      groupId: group.id.toString(),
      memberId: memberUser.publicId,
    });

    if (existing?.status === 'ACTIVE') {
      return fail(new ConflictError('User is already part of this group'));
    }

    if (existing?.status === 'BLOCKED') {
      return fail(new ForbiddenError('Only active group members can invite'));
    }

    // The membership stays as INVITED until the invited person accepts.
    // It never grants access on its own.
    const membership =
      existing ?? GroupMember.create({ groupId: group.id, memberId: new UniqueEntityID(memberUser.publicId) });

    // Raises GroupMemberInvitedEvent; OnGroupMemberInvited notifies the invitee.
    membership.inviteBy(new UniqueEntityID(inviter.publicId));

    if (existing) {
      await this.groupMembersRepository.save(membership);
    } else {
      await this.groupMembersRepository.create(membership);
    }

    return success({ membership: { groupPublicId: group.id.toString(), status: membership.status } });
  }
}
