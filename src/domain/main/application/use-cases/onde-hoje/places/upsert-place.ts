import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import { GeocodingGateway } from '../../../gateways/geocoding-gateway';
import type { Place } from '../../../../enterprise/entities/onde-hoje/places/place';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface UpsertPlaceUseCaseRequest {
  currentUserPublicId: string;
  googlePlaceId: string;
  name: string;
  googlePlaceName?: string;
  nickname?: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  photoUrl?: string;
  websiteUrl?: string;
  mapsUrl?: string;
}

type UpsertPlaceUseCaseResponse = Result<ResourceNotFoundError, { place: Place }>;

@Injectable()
export class UpsertPlaceUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(GeocodingGateway) private geocodingGateway: GeocodingGateway,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: UpsertPlaceUseCaseRequest): Promise<UpsertPlaceUseCaseResponse> {
    const { currentUserPublicId, ...placeData } = request;
    const user = await this.usersRepository.findByPublicId(currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const enrichedPlaceData = await this.enrichWithGeocoding(placeData);
    const place = await this.placesRepository.upsert({
      ...enrichedPlaceData,
      createdById: user.id,
    });

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.place.upserted',
        aggregateId: place.publicId,
        actorId: currentUserPublicId,
        payload: {
          id: place.publicId,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
        },
      }),
    );

    return success({ place });
  }

  // Map-click votes may arrive without a resolved city/state (client-side geocode
  // failed). Reverse-geocode the coordinates on the server to fill the missing
  // fields so the place shows up in city/state filters.
  private async enrichWithGeocoding(
    placeData: Omit<UpsertPlaceUseCaseRequest, 'currentUserPublicId'>,
  ): Promise<Omit<UpsertPlaceUseCaseRequest, 'currentUserPublicId'>> {
    if (placeData.city && placeData.state) {
      return placeData;
    }

    const geocoded = await this.geocodingGateway.reverseGeocode(placeData.latitude, placeData.longitude);

    if (!geocoded) {
      return placeData;
    }

    const isMapClick = placeData.googlePlaceId.startsWith('map-click:');

    return {
      ...placeData,
      city: placeData.city ?? geocoded.city ?? undefined,
      state: placeData.state ?? geocoded.state ?? undefined,
      country: placeData.country ?? geocoded.country ?? undefined,
      formattedAddress:
        isMapClick && geocoded.formattedAddress ? geocoded.formattedAddress : placeData.formattedAddress,
    };
  }
}
