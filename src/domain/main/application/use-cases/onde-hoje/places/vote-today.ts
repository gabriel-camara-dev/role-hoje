import { Inject, Injectable } from '@nestjs/common';
import { todayDateOnly } from '@/core/date/date-only';
import { createDomainEvent } from '@/core/events/domain-event';
import { EventBus } from '@/core/events/event-bus';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { PlaceVote, PlaceVoteType } from '../../../../enterprise/entities/onde-hoje/places/place-vote';
import { VoteLimitExceededError } from '../../errors/vote-limit-exceeded-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';

interface VoteTodayUseCaseRequest {
  currentUserPublicId: string;
  placePublicId: string;
  day?: Date;
  groupPublicId?: string;
  note?: string;
  voteType?: PlaceVoteType;
  showIdentity?: boolean;
}

const MAX_ACTIVE_VOTES_PER_WEEK = 6;

type VoteTodayUseCaseResponse = Result<ResourceNotFoundError | VoteLimitExceededError, { vote: PlaceVote }>;

@Injectable()
export class VoteTodayUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
    @Inject(EventBus) private eventBus: EventBus,
    @Inject(NotificationDispatcher) private notificationDispatcher: NotificationDispatcher,
  ) {}

  async execute(request: VoteTodayUseCaseRequest): Promise<VoteTodayUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);
    const day = request.day ?? todayDateOnly();

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const activeVotesThisWeek = await this.placesRepository.countActiveVotesForWeekExcludingTarget({
      userId: user.id,
      placePublicId: request.placePublicId,
      day,
      groupPublicId: request.groupPublicId,
    });

    if (activeVotesThisWeek === null) {
      return fail(new ResourceNotFoundError('Place or group not found'));
    }

    // Admins have no weekly vote limit.
    if (user.role !== 'ADMIN' && activeVotesThisWeek >= MAX_ACTIVE_VOTES_PER_WEEK) {
      return fail(new VoteLimitExceededError(MAX_ACTIVE_VOTES_PER_WEEK));
    }

    const vote = await this.placesRepository.vote({
      userId: user.id,
      placePublicId: request.placePublicId,
      day,
      groupPublicId: request.groupPublicId,
      note: request.note,
      voteType: request.voteType,
      showIdentity: request.showIdentity,
    });

    if (!vote) {
      return fail(new ResourceNotFoundError('Place or group not found'));
    }

    await this.notifyOtherVoters({
      actorUserId: user.id,
      placePublicId: request.placePublicId,
      day,
      groupPublicId: request.groupPublicId,
      showIdentity: request.showIdentity ?? true,
    });

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

  private async notifyOtherVoters(input: {
    actorUserId: number;
    placePublicId: string;
    day: Date;
    groupPublicId?: string;
    showIdentity: boolean;
  }): Promise<void> {
    const targets = await this.placesRepository.findVoteNotificationTargets({
      actorUserId: input.actorUserId,
      placePublicId: input.placePublicId,
      day: input.day,
      groupPublicId: input.groupPublicId,
    });

    if (!targets || targets.recipients.length === 0) {
      return;
    }

    const dayKey = input.day.toISOString().slice(0, 10);
    const groupKey = `place-vote:${targets.placePublicId}:${dayKey}:${input.groupPublicId ?? 'global'}`;
    const actor = input.showIdentity ? targets.actor : null;

    await Promise.all(
      targets.recipients.map((recipient) =>
        this.notificationDispatcher.dispatchAggregatedVote({
          recipientId: recipient.id,
          recipientPublicId: recipient.publicId,
          groupKey,
          placeName: targets.placeName,
          placePublicId: targets.placePublicId,
          actor,
        }),
      ),
    );
  }
}
