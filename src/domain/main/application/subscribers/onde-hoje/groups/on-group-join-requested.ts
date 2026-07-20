import { Inject, Injectable } from '@nestjs/common';
import { DomainEvents } from '@/core/events/domain-events';
import type { EventHandler } from '@/core/events/event-handler';
import { GroupJoinRequestedEvent } from '@/domain/main/enterprise/events/onde-hoje/groups/group-join-requested-event';
import { GroupMembersRepository } from '../../../repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { NotificationDispatcher } from '../../../use-cases/onde-hoje/notifications/notification-dispatcher';

@Injectable()
export class OnGroupJoinRequested implements EventHandler {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(GroupMembersRepository) private groupMembersRepository: GroupMembersRepository,
    @Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher,
  ) {
    this.setupSubscriptions();
  }

  setupSubscriptions(): void {
    DomainEvents.register(this.handle.bind(this), GroupJoinRequestedEvent.name);
  }

  private async handle({ groupMember }: GroupJoinRequestedEvent) {
    const [group, owner] = await Promise.all([
      this.groupsRepository.findById(groupMember.groupId.toString()),
      this.groupMembersRepository.findOwnerByGroupId(groupMember.groupId.toString()),
    ]);

    if (!group || !owner) {
      return;
    }

    await this.notificationDispatcher.dispatch({
      recipientPublicId: owner.memberId.toString(),
      actorPublicId: groupMember.memberId.toString(),
      type: 'GROUP_JOIN_REQUEST',
      title: `Novo pedido de entrada em ${group.name}`,
      body: 'Alguem pediu para entrar no seu grupo. Toque para revisar.',
      data: { groupPublicId: group.id.toString(), groupName: group.name },
    });
  }
}
