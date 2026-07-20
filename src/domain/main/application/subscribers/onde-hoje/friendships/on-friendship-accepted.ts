import { Inject, Injectable } from '@nestjs/common';
import { DomainEvents } from '@/core/events/domain-events';
import type { EventHandler } from '@/core/events/event-handler';
import { FriendshipAcceptedEvent } from '@/domain/main/enterprise/events/onde-hoje/friendships/friendship-accepted-event';
import { NotificationDispatcher } from '../../../use-cases/onde-hoje/notifications/notification-dispatcher';

@Injectable()
export class OnFriendshipAccepted implements EventHandler {
  constructor(@Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher) {
    this.setupSubscriptions();
  }

  setupSubscriptions(): void {
    DomainEvents.register(this.handle.bind(this), FriendshipAcceptedEvent.name);
  }

  private async handle({ friendship }: FriendshipAcceptedEvent) {
    await this.notificationDispatcher.dispatch({
      recipientPublicId: friendship.requesterId.toString(),
      actorPublicId: friendship.addresseeId.toString(),
      type: 'FRIEND_ACCEPTED',
      title: 'Pedido de amizade aceito',
      body: 'Voces agora sao amigos.',
      data: {},
    });
  }
}
