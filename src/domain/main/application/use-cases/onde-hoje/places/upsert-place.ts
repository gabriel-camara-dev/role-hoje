import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { Place } from '../../../../enterprise/entities/onde-hoje/places/place';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface UpsertPlaceUseCaseRequest {
  currentUserPublicId: string;
  googlePlaceId: string;
  name: string;
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
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: UpsertPlaceUseCaseRequest): Promise<UpsertPlaceUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const place = await this.placesRepository.upsert({
      ...request,
      createdById: user.id,
    });

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.place.upserted',
        aggregateId: place.publicId,
        actorId: request.currentUserPublicId,
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
}
