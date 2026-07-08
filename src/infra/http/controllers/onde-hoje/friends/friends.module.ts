import { Module } from '@nestjs/common';
import { AcceptFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/accept-friendship';
import { ListFriendsUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/list-friends';
import { RejectFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/reject-friendship';
import { RemoveFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/remove-friendship';
import { RequestFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/request-friendship';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AcceptFriendshipController } from './accept-friendship.controller';
import { ListFriendsController } from './list-friends.controller';
import { RejectFriendshipController } from './reject-friendship.controller';
import { RemoveFriendshipController } from './remove-friendship.controller';
import { RequestFriendshipController } from './request-friendship.controller';

@Module({
  imports: [DatabaseModule, EventsModule, NotificationsModule],
  controllers: [
    ListFriendsController,
    RequestFriendshipController,
    AcceptFriendshipController,
    RejectFriendshipController,
    RemoveFriendshipController,
  ],
  providers: [
    ListFriendsUseCase,
    RequestFriendshipUseCase,
    AcceptFriendshipUseCase,
    RejectFriendshipUseCase,
    RemoveFriendshipUseCase,
  ],
})
export class FriendsModule {}
