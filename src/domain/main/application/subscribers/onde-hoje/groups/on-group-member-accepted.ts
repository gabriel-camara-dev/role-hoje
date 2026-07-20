import { Inject, Injectable } from '@nestjs/common';
import { DomainEvents } from '@/core/events/domain-events';
import type { EventHandler } from '@/core/events/event-handler';
import { GroupMemberAcceptedEvent } from '@/domain/main/enterprise/events/onde-hoje/groups/group-member-accepted-event';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { NotificationDispatcher } from '../../../use-cases/onde-hoje/notifications/notification-dispatcher';

@Injectable()
export class OnGroupMemberAccepted implements EventHandler {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher,
  ) {
    this.setupSubscriptions();
  }

  setupSubscriptions(): void {
    DomainEvents.register(this.handle.bind(this), GroupMemberAcceptedEvent.name);
  }

  private async handle({ groupMember, actorId }: GroupMemberAcceptedEvent) {
    const group = await this.groupsRepository.findById(groupMember.groupId.toString());

    if (!group) {
      return;
    }

    await this.notificationDispatcher.dispatch({
      recipientPublicId: groupMember.memberId.toString(),
      actorPublicId: actorId.toString(),
      type: 'GROUP_MEMBER_ACCEPTED',
      title: `Pedido aceito em ${group.name}`,
      body: `Voce agora faz parte do grupo ${group.name}.`,
      data: { groupPublicId: group.id.toString(), groupName: group.name },
    });
  }
}
