import { Module } from '@nestjs/common';
import { GetMapHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-map-history';
import { GetMapPlaceUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-map-place';
import { GetTodayMapUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-today-map';
import { ListGlobalTopPlacesUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-global-top-places';
import { ListTopPlacesTodayUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-top-places-today';
import { CacheModule } from '@/infra/cache/cache.module';
import { DatabaseModule } from '@/infra/database/database.module';
import { GetMapHistoryController } from './get-map-history.controller';
import { GetMapPlaceController } from './get-map-place.controller';
import { GetTodayMapController } from './get-today-map.controller';
import { ListTopPlacesController } from './list-top-places.controller';
import { OptionalViewerResolver } from './optional-viewer';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [GetTodayMapController, GetMapPlaceController, ListTopPlacesController, GetMapHistoryController],
  providers: [
    GetTodayMapUseCase,
    GetMapPlaceUseCase,
    ListTopPlacesTodayUseCase,
    ListGlobalTopPlacesUseCase,
    GetMapHistoryUseCase,
    OptionalViewerResolver,
  ],
})
export class MapModule {}
