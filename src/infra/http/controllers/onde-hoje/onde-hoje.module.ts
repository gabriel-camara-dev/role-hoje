import { Module } from '@nestjs/common';
import { GetAdminDashboardUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-dashboard';
import { AcceptFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/accept-friendship';
import { ListFriendsUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/list-friends';
import { RequestFriendshipUseCase } from '@/domain/main/application/use-cases/onde-hoje/friendships/request-friendship';
import { AcceptGroupMemberUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/accept-group-member';
import { CreateGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/create-group';
import { JoinGroupUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/join-group';
import { ListPublicGroupsUseCase } from '@/domain/main/application/use-cases/onde-hoje/groups/list-public-groups';
import { GetMapHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-map-history';
import { GetPlaceAttendanceEstimateUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-place-attendance-estimate';
import { GetTodayMapUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-today-map';
import { ListPlacesUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-places';
import { ListMyVoteHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-my-vote-history';
import { ListTopPlacesTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-top-places-today';
import { UpsertPlaceUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/upsert-place';
import { VoteTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/vote-today';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { OndeHojeAdminController } from './admin.controller';
import { FriendsController } from './friends.controller';
import { GroupsController } from './groups.controller';
import { PlacesController } from './places.controller';
import { TodayMapController } from './today-map.controller';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [PlacesController, TodayMapController, GroupsController, FriendsController, OndeHojeAdminController],
  providers: [
    ListPlacesUseCase,
    UpsertPlaceUseCase,
    GetTodayMapUseCase,
    GetMapHistoryUseCase,
    GetPlaceAttendanceEstimateUseCase,
    ListMyVoteHistoryUseCase,
    ListTopPlacesTodayUseCase,
    VoteTodayUseCase,
    AcceptGroupMemberUseCase,
    ListPublicGroupsUseCase,
    CreateGroupUseCase,
    JoinGroupUseCase,
    ListFriendsUseCase,
    RequestFriendshipUseCase,
    AcceptFriendshipUseCase,
    GetAdminDashboardUseCase,
  ],
})
export class OndeHojeModule {}
