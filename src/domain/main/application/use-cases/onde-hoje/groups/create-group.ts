import { Inject, Injectable } from '@nestjs/common';
import { PasswordHasher } from '@/domain/main/application/use-cases/users/password-hasher';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import type { Group, GroupPrivacy } from '../../../../enterprise/entities/onde-hoje/groups/group';
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
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(PasswordHasher) private passwordHasher: PasswordHasher,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: CreateGroupUseCaseRequest): Promise<CreateGroupUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const group = await this.groupsRepository.create({
      name: request.name,
      description: request.description,
      privacy: request.privacy,
      passwordHash:
        request.privacy === 'PRIVATE' && request.password ? await this.passwordHasher.hash(request.password) : null,
      createdById: user.id,
    });

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.group.created',
        aggregateId: group.publicId,
        actorId: request.currentUserPublicId,
        payload: {
          id: group.publicId,
          name: group.name,
          privacy: group.privacy,
        },
        recipientIds: [request.currentUserPublicId],
      }),
    );

    return success({ group });
  }
}
