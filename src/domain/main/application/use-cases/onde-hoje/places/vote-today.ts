import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { PlaceVote } from '../../../../enterprise/entities/onde-hoje/places/place-vote';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface VoteTodayUseCaseRequest {
  currentUserPublicId: string;
  placePublicId: string;
  groupPublicId?: string;
  note?: string;
}

type VoteTodayUseCaseResponse = Result<ResourceNotFoundError, { vote: PlaceVote }>;

@Injectable()
export class VoteTodayUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: VoteTodayUseCaseRequest): Promise<VoteTodayUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const vote = await this.placesRepository.voteToday({
      userId: user.id,
      placePublicId: request.placePublicId,
      groupPublicId: request.groupPublicId,
      note: request.note,
    });

    if (!vote) {
      return fail(new ResourceNotFoundError('Place or group not found'));
    }

    return success({ vote });
  }
}

