import { Module } from '@nestjs/common';
import { OndeHojeAdminModule } from './admin/admin.module';
import { FriendsModule } from './friends/friends.module';
import { GroupsModule } from './groups/groups.module';
import { MapModule } from './map/map.module';
import { PlacesModule } from './places/places.module';
import { VotesModule } from './votes/votes.module';

@Module({
  imports: [PlacesModule, MapModule, VotesModule, GroupsModule, FriendsModule, OndeHojeAdminModule],
})
export class OndeHojeModule {}
