import { Inject, Injectable } from '@nestjs/common';
import { DomainEvents } from '@/core/events/domain-events';
import type { EventHandler } from '@/core/events/event-handler';
import { GroupMemberInvitedEvent } from '@/domain/main/enterprise/events/onde-hoje/groups/group-member-invited-event';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { NotificationDispatcher } from '../../../use-cases/onde-hoje/notifications/notification-dispatcher';

@Injectable()
export class OnGroupMemberInvited implements EventHandler {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher,
  ) {
    this.setupSubscriptions();
  }

  setupSubscriptions(): void {
    DomainEvents.register(this.handle.bind(this), GroupMemberInvitedEvent.name);
  }

  private async handle({ groupMember, actorId }: GroupMemberInvitedEvent) {
    const group = await this.groupsRepository.findById(groupMember.groupId.toString());

    if (!group) {
      return;
    }

    await this.notificationDispatcher.dispatch({
      recipientPublicId: groupMember.memberId.toString(),
      actorPublicId: actorId.toString(),
      type: 'GROUP_INVITE',
      title: `Convite para o grupo ${group.name}`,
      body: 'Toque para aceitar ou recusar o convite.',
      data: { groupPublicId: group.id.toString(), groupName: group.name },
    });
  }
}
