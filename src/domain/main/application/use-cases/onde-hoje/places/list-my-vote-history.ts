import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { UserVoteHistoryItem } from '../../../../enterprise/entities/onde-hoje/places/place-history';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface ListMyVoteHistoryUseCaseRequest {
  currentUserPublicId: string;
  limit?: number;
}

type ListMyVoteHistoryUseCaseResponse = Result<ResourceNotFoundError, { votes: UserVoteHistoryItem[] }>;

@Injectable()
export class ListMyVoteHistoryUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: ListMyVoteHistoryUseCaseRequest): Promise<ListMyVoteHistoryUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const votes = await this.placesRepository.userVoteHistory(user.publicId, request.limit ?? 30);

    return success({ votes });
  }
}
