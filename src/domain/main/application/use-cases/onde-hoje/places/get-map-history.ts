import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { PlaceHistoryDay } from '../../../../enterprise/entities/onde-hoje/places/place-history';
import { type PlaceHistoryQuery, PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

type GetMapHistoryUseCaseResponse = Result<ResourceNotFoundError, { history: PlaceHistoryDay[] }>;

@Injectable()
export class GetMapHistoryUseCase {
  constructor(@Inject(PlacesRepository) private placesRepository: PlacesRepository) {}

  async execute(query: PlaceHistoryQuery): Promise<GetMapHistoryUseCaseResponse> {
    const history = await this.placesRepository.history(query);

    if (!history) {
      return fail(new ResourceNotFoundError('Group not found'));
    }

    return success({ history });
  }
}
