import { Inject, Injectable } from '@nestjs/common';
import { DomainEvents } from '@/core/events/domain-events';
import type { EventHandler } from '@/core/events/event-handler';
import { GroupInviteAcceptedEvent } from '@/domain/main/enterprise/events/onde-hoje/groups/group-invite-accepted-event';
import { GroupMembersRepository } from '../../../repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '../../../repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { NotificationDispatcher } from '../../../use-cases/onde-hoje/notifications/notification-dispatcher';

@Injectable()
export class OnGroupInviteAccepted implements EventHandler {
  constructor(
    @Inject(GroupsRepository) private groupsRepository: GroupsRepository,
    @Inject(GroupMembersRepository) private groupMembersRepository: GroupMembersRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher,
  ) {
    this.setupSubscriptions();
  }

  setupSubscriptions(): void {
    DomainEvents.register(this.handle.bind(this), GroupInviteAcceptedEvent.name);
  }

  private async handle({ groupMember }: GroupInviteAcceptedEvent) {
    const [group, owner, member] = await Promise.all([
      this.groupsRepository.findById(groupMember.groupId.toString()),
      this.groupMembersRepository.findOwnerByGroupId(groupMember.groupId.toString()),
      this.usersRepository.findByPublicId(groupMember.memberId.toString()),
    ]);

    if (!group || !owner || !member) {
      return;
    }

    await this.notificationDispatcher.dispatch({
      recipientPublicId: owner.memberId.toString(),
      actorPublicId: groupMember.memberId.toString(),
      type: 'GROUP_INVITE_ACCEPTED',
      title: `${member.name} entrou no grupo`,
      body: `${member.name} aceitou o convite para o grupo ${group.name}.`,
      data: { groupPublicId: group.id.toString(), groupName: group.name },
    });
  }
}
