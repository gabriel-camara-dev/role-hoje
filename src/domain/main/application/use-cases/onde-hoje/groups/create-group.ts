import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { createIntegrationEvent } from '@/core/events/integration-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { PasswordHasher } from '@/domain/main/application/use-cases/users/password-hasher';
import { Group, type GroupPrivacy } from '../../../../enterprise/entities/onde-hoje/groups/group';
import { GroupMember } from '../../../../enterprise/entities/onde-hoje/groups/group-member';
import { GroupMembersRepository } from '../../../repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { TransactionRepository } from '../../../repositories/transaction-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface CreateGroupUseCaseRequest {
  currentUserPublicId: string;
  name: string;
  description?: string;
  privacy: GroupPrivacy;
  password?: string;
}

type CreateGroupUseCaseResponse = Result<ResourceNotFoundError, { group: Group }>;

@Injectable()
export class CreateGroupUseCase {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(GroupMembersRepository) private groupMembersRepository: GroupMembersRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(PasswordHasher) private passwordHasher: PasswordHasher,
    @Inject(EventBus) private eventBus: EventBus,
    @Inject(TransactionRepository) private transactionRepository: TransactionRepository,
  ) {}

  async execute(request: CreateGroupUseCaseRequest): Promise<CreateGroupUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const ownerId = new UniqueEntityID(user.publicId);

    const group = Group.create({
      name: request.name,
      description: request.description ?? null,
      privacy: request.privacy,
      passwordHash:
        request.privacy === 'PRIVATE' && request.password ? await this.passwordHasher.hash(request.password) : null,
      city: null,
      state: null,
      ownerId,
    });

    const owner = GroupMember.create({
      groupId: group.id,
      memberId: ownerId,
      role: 'OWNER',
      status: 'ACTIVE',
    });

    // A group without its owner is never a valid state, so both rows land together.
    await this.transactionRepository.transaction(async () => {
      await this.groupsRepository.create(group);
      await this.groupMembersRepository.create(owner);
    });

    await this.eventBus.publish(
      createIntegrationEvent({
        eventName: 'onde-hoje.group.created',
        aggregateId: group.id.toString(),
        actorId: request.currentUserPublicId,
        payload: {
          id: group.id.toString(),
          name: group.name,
          privacy: group.privacy,
        },
        recipientIds: [request.currentUserPublicId],
      }),
    );

    return success({ group });
  }
}
