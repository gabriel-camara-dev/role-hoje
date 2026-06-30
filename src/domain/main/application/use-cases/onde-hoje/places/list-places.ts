import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import {
  type ListPlacesQuery,
  PlacesRepository,
} from '../../../repositories/onde-hoje/places-repository';
import type { Place } from '../../../../enterprise/entities/onde-hoje/places/place';

type ListPlacesUseCaseResponse = Result<never, { places: Place[] }>;

@Injectable()
export class ListPlacesUseCase {
  constructor(@Inject(PlacesRepository) private placesRepository: PlacesRepository) {}

  async execute(query: ListPlacesQuery): Promise<ListPlacesUseCaseResponse> {
    const places = await this.placesRepository.list(query);

    return success({ places });
  }
}

