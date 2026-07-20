import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { GroupMembersRepository } from '../../../repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { TransactionRepository } from '../../../repositories/transaction-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface LeaveGroupUseCaseRequest {
  currentUserPublicId: string;
  groupPublicId: string;
}

type LeaveGroupUseCaseResponse = Result<ResourceNotFoundError, { left: true; groupDeleted: boolean }>;

@Injectable()
export class LeaveGroupUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(GroupMembersRepository) private groupMembersRepository: GroupMembersRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(TransactionRepository) private transactionRepository: TransactionRepository,
  ) {}

  async execute(request: LeaveGroupUseCaseRequest): Promise<LeaveGroupUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    // Handing the group over and dropping the old owner has to be all-or-nothing:
    // a half-applied succession would leave the group ownerless.
    return this.transactionRepository.transaction(async () => {
      const group = await this.groupsRepository.findById(request.groupPublicId);

      if (!group) {
        return fail(new ResourceNotFoundError('Group membership not found'));
      }

      const membership = await this.groupMembersRepository.findByGroupAndMember({
        groupId: group.id.toString(),
        memberId: user.publicId,
      });

      if (!membership?.isActive) {
        return fail(new ResourceNotFoundError('Group membership not found'));
      }

      if (!membership.isOwner) {
        await this.groupMembersRepository.delete(membership);

        return success({ left: true, groupDeleted: false });
      }

      const successor = await this.groupMembersRepository.findSuccessor({
        groupId: group.id.toString(),
        exceptMemberId: user.publicId,
      });

      // The last member out takes the group with them.
      if (!successor) {
        await this.groupsRepository.delete(group);

        return success({ left: true, groupDeleted: true });
      }

      successor.promoteToOwner();
      group.handOverTo(successor.memberId);

      await this.groupMembersRepository.save(successor);
      await this.groupsRepository.save(group);
      await this.groupMembersRepository.delete(membership);

      return success({ left: true, groupDeleted: false });
    });
  }
}
