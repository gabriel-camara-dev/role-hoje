import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { PlaceVote } from '../../../../enterprise/entities/onde-hoje/places/place-vote';
import { VoteLimitExceededError } from '../../errors/vote-limit-exceeded-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface VoteTodayUseCaseRequest {
  currentUserPublicId: string;
  placePublicId: string;
  day?: Date;
  groupPublicId?: string;
  note?: string;
}

const MAX_ACTIVE_VOTES_PER_DAY = 3;

type VoteTodayUseCaseResponse = Result<ResourceNotFoundError | VoteLimitExceededError, { vote: PlaceVote }>;

@Injectable()
export class VoteTodayUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: VoteTodayUseCaseRequest): Promise<VoteTodayUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);
    const day = request.day ?? todayDate();

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const activeVotesBeforeThisTarget = await this.placesRepository.countActiveVotesForDayExcludingTarget({
      userId: user.id,
      placePublicId: request.placePublicId,
      day,
      groupPublicId: request.groupPublicId,
    });

    if (activeVotesBeforeThisTarget === null) {
      return fail(new ResourceNotFoundError('Place or group not found'));
    }

    if (activeVotesBeforeThisTarget >= MAX_ACTIVE_VOTES_PER_DAY) {
      return fail(new VoteLimitExceededError(MAX_ACTIVE_VOTES_PER_DAY));
    }

    const vote = await this.placesRepository.vote({
      userId: user.id,
      placePublicId: request.placePublicId,
      day,
      groupPublicId: request.groupPublicId,
      note: request.note,
    });

    if (!vote) {
      return fail(new ResourceNotFoundError('Place or group not found'));
    }

    const payload = {
      voteId: vote.publicId,
      placeId: request.placePublicId,
      day: day.toISOString().slice(0, 10),
      groupId: request.groupPublicId,
    };

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.place.voted',
        aggregateId: request.placePublicId,
        actorId: request.currentUserPublicId,
        payload,
      }),
    );

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.place.voted-today',
        aggregateId: request.placePublicId,
        actorId: request.currentUserPublicId,
        payload,
      }),
    );

    return success({ vote });
  }
}

function todayDate() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
