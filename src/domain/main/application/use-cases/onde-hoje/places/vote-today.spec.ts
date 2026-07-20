import type { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { PlaceVote } from '../../../../enterprise/entities/onde-hoje/places/place-vote';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { VoteDeclineNotAllowedError } from '../../errors/vote-decline-not-allowed-error';
import { VoteLimitExceededError } from '../../errors/vote-limit-exceeded-error';
import type { NotificationDispatcher } from '../notifications/notification-dispatcher';
import { VoteTodayUseCase } from './vote-today';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeUser } from '@test/factories/make-user';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

const aVote = { publicId: 'vote-1' } as PlaceVote;

interface PlacesStub {
  countActiveVotesForWeekExcludingTarget: ReturnType<typeof vi.fn>;
  hasActiveGoingVote: ReturnType<typeof vi.fn>;
  vote: ReturnType<typeof vi.fn>;
  findVoteNotificationTargets: ReturnType<typeof vi.fn>;
}

let usersRepository: InMemoryOndeHojeUsersRepository;
let places: PlacesStub;
let dispatchAggregatedVote: ReturnType<typeof vi.fn>;
let fakeEventBus: FakeEventBus;
let sut: VoteTodayUseCase;

function buildSut() {
  fakeEventBus = new FakeEventBus();
  dispatchAggregatedVote = vi.fn(async () => undefined);
  sut = new VoteTodayUseCase(places as unknown as PlacesRepository, usersRepository, fakeEventBus, {
    dispatchAggregatedVote,
  } as unknown as NotificationDispatcher);
}

describe('Vote Today', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    places = {
      countActiveVotesForWeekExcludingTarget: vi.fn(async () => 0),
      hasActiveGoingVote: vi.fn(async () => true),
      vote: vi.fn(async () => aVote),
      findVoteNotificationTargets: vi.fn(async () => null),
    };
    buildSut();
  });

  it('records a going vote and publishes the place events', async () => {
    const user = makeUser();
    usersRepository.items.push(user);

    const result = await sut.execute({ currentUserPublicId: user.publicId, placePublicId: 'place-1' });

    expect(result.isSuccess()).toBe(true);
    expect(places.vote).toHaveBeenCalled();
    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'onde-hoje.place.voted' }));
    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'onde-hoje.place.voted-today' }));
  });

  it('blocks a non-admin who already hit the weekly limit', async () => {
    const user = makeUser({ role: 'DEFAULT' });
    usersRepository.items.push(user);
    places.countActiveVotesForWeekExcludingTarget.mockResolvedValue(6);

    const result = await sut.execute({ currentUserPublicId: user.publicId, placePublicId: 'place-1' });

    expect((result as { value: unknown }).value).toBeInstanceOf(VoteLimitExceededError);
    expect(places.vote).not.toHaveBeenCalled();
  });

  it('lets an admin vote past the weekly limit', async () => {
    const admin = makeUser({ role: 'ADMIN' });
    usersRepository.items.push(admin);
    places.countActiveVotesForWeekExcludingTarget.mockResolvedValue(20);

    const result = await sut.execute({ currentUserPublicId: admin.publicId, placePublicId: 'place-1' });

    expect(result.isSuccess()).toBe(true);
  });

  it('allows a "not going" decline when a proposal exists', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    places.hasActiveGoingVote.mockResolvedValue(true);

    const result = await sut.execute({ currentUserPublicId: user.publicId, placePublicId: 'place-1', going: false });

    expect(result.isSuccess()).toBe(true);
  });

  it('rejects a "not going" decline when nobody proposed the place', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    places.hasActiveGoingVote.mockResolvedValue(false);

    const result = await sut.execute({ currentUserPublicId: user.publicId, placePublicId: 'place-1', going: false });

    expect((result as { value: unknown }).value).toBeInstanceOf(VoteDeclineNotAllowedError);
    expect(places.vote).not.toHaveBeenCalled();
  });

  it('fails when the place or group cannot be found', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    places.countActiveVotesForWeekExcludingTarget.mockResolvedValue(null);

    const result = await sut.execute({ currentUserPublicId: user.publicId, placePublicId: 'place-1' });

    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({ currentUserPublicId: 'non-existing-public-id', placePublicId: 'place-1' });

    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
