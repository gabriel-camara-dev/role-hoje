import { Inject, Injectable } from '@nestjs/common';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { PlaceVote } from '../../../../enterprise/entities/onde-hoje/places/place-vote';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface CancelVoteUseCaseRequest {
  currentUserPublicId: string;
  placePublicId: string;
  day: Date;
  groupPublicId?: string;
}

type CancelVoteUseCaseResponse = Result<ResourceNotFoundError, { vote: PlaceVote }>;

@Injectable()
export class CancelVoteUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
  ) {}

  async execute(request: CancelVoteUseCaseRequest): Promise<CancelVoteUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const vote = await this.placesRepository.cancelVote({
      userId: user.id,
      placePublicId: request.placePublicId,
      day: request.day,
      groupPublicId: request.groupPublicId,
    });

    if (!vote) {
      return fail(new ResourceNotFoundError('Active vote not found'));
    }

    await this.eventBus.publish(
      createDomainEvent({
        eventName: 'onde-hoje.place.vote-cancelled',
        aggregateId: request.placePublicId,
        actorId: request.currentUserPublicId,
        payload: {
          voteId: vote.publicId,
          placeId: request.placePublicId,
          day: request.day.toISOString().slice(0, 10),
          groupId: request.groupPublicId,
        },
      }),
    );

    return success({ vote });
  }
}
