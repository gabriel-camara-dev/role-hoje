import { Inject, Injectable } from '@nestjs/common';
import { DomainEvents } from '@/core/events/domain-events';
import type { EventHandler } from '@/core/events/event-handler';
import { FriendshipRequestedEvent } from '@/domain/main/enterprise/events/onde-hoje/friendships/friendship-requested-event';
import { NotificationDispatcher } from '../../../use-cases/onde-hoje/notifications/notification-dispatcher';

@Injectable()
export class OnFriendshipRequested implements EventHandler {
  constructor(@Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher) {
    this.setupSubscriptions();
  }

  setupSubscriptions(): void {
    DomainEvents.register(this.handle.bind(this), FriendshipRequestedEvent.name);
  }

  private async handle({ friendship }: FriendshipRequestedEvent) {
    await this.notificationDispatcher.dispatch({
      recipientPublicId: friendship.addresseeId.toString(),
      actorPublicId: friendship.requesterId.toString(),
      type: 'FRIEND_REQUEST',
      title: 'Novo pedido de amizade',
      body: 'Voce recebeu um pedido de amizade. Toque para responder.',
      data: {},
    });
  }
}
