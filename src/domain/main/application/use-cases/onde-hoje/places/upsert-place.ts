import { Inject, Injectable } from '@nestjs/common';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { createIntegrationEvent } from '@/core/events/integration-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import { GeocodingGateway } from '../../../gateways/geocoding-gateway';
import { Place } from '../../../../enterprise/entities/onde-hoje/places/place';
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

    const draft = Place.create({
      googlePlaceId: placeData.googlePlaceId,
      name: placeData.name,
      googlePlaceName: placeData.googlePlaceName ?? null,
      nickname: placeData.nickname ?? null,
      formattedAddress: placeData.formattedAddress,
      latitude: placeData.latitude,
      longitude: placeData.longitude,
      city: placeData.city ?? null,
      state: placeData.state ?? null,
      country: placeData.country ?? null,
      photoUrl: placeData.photoUrl ?? null,
      websiteUrl: placeData.websiteUrl ?? null,
      mapsUrl: placeData.mapsUrl ?? null,
      createdById: new UniqueEntityID(user.publicId),
    });

    await this.locateIfNeeded(draft);

    const place = await this.placesRepository.upsert(draft);

    await this.eventBus.publish(
      createIntegrationEvent({
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
  private async locateIfNeeded(place: Place): Promise<void> {
    if (place.city && place.state) {
      return;
    }

    const geocoded = await this.geocodingGateway.reverseGeocode(place.latitude, place.longitude);

    if (!geocoded) {
      return;
    }

    place.locateAt({
      city: geocoded.city,
      state: geocoded.state,
      country: geocoded.country,
      // Only a map click has no address of its own worth keeping.
      formattedAddress: place.isMapClick ? (geocoded.formattedAddress ?? undefined) : undefined,
    });
  }
}
