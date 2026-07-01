import { Module } from '@nestjs/common';
import { AcceptFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/accept-friendship';
import { ListFriendsUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/list-friends';
import { RequestFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/request-friendship';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { AcceptFriendshipController } from './accept-friendship.controller';
import { ListFriendsController } from './list-friends.controller';
import { RequestFriendshipController } from './request-friendship.controller';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [ListFriendsController, RequestFriendshipController, AcceptFriendshipController],
  providers: [ListFriendsUseCase, RequestFriendshipUseCase, AcceptFriendshipUseCase],
})
export class FriendsModule {}
