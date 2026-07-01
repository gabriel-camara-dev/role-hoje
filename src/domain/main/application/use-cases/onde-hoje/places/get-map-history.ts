import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import type { PlaceHistoryDay } from '../../../../enterprise/entities/onde-hoje/places/place-history';
import { type PlaceHistoryQuery, PlacesRepository } from '../../../repositories/onde-hoje/places-repository';

type GetMapHistoryUseCaseResponse = Result<never, { history: PlaceHistoryDay[] }>;

@Injectable()
export class GetMapHistoryUseCase {
  constructor(@Inject(PlacesRepository) private placesRepository: PlacesRepository) {}

  async execute(query: PlaceHistoryQuery): Promise<GetMapHistoryUseCaseResponse> {
    const history = await this.placesRepository.history(query);

    return success({ history });
  }
}
