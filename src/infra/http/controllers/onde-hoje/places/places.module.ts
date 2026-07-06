import { Module } from '@nestjs/common';
import { GeocodingGateway } from '@/domain/main/application/gateways/geocoding-gateway';
import { GetPlaceAttendanceEstimateUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/get-place-attendance-estimate';
import { ListPlacesUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/list-places';
import { UpsertPlaceUseCase } from '@/domain/main/application/use-cases/onde-hoje/places/upsert-place';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { NominatimGeocodingService } from '@/infra/geocoding/nominatim-geocoding.service';
import { GetPlaceAttendanceEstimateController } from './get-place-attendance-estimate.controller';
import { ListPlacesController } from './list-places.controller';
import { UpsertPlaceController } from './upsert-place.controller';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [ListPlacesController, UpsertPlaceController, GetPlaceAttendanceEstimateController],
  providers: [
    ListPlacesUseCase,
    UpsertPlaceUseCase,
    GetPlaceAttendanceEstimateUseCase,
    { provide: GeocodingGateway, useClass: NominatimGeocodingService },
  ],
})
export class PlacesModule {}
