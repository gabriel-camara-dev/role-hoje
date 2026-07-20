import type { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { PlaceVote } from '../../../../enterprise/entities/onde-hoje/places/place-vote';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { CancelVoteUseCase } from './cancel-vote';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeUser } from '@test/factories/make-user';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

const aVote = { publicId: 'vote-1' } as PlaceVote;

let usersRepository: InMemoryOndeHojeUsersRepository;
let cancelVote: ReturnType<typeof vi.fn>;
let fakeEventBus: FakeEventBus;
let sut: CancelVoteUseCase;

describe('Cancel Vote', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    cancelVote = vi.fn(async () => aVote);
    fakeEventBus = new FakeEventBus();
    sut = new CancelVoteUseCase({ cancelVote } as unknown as PlacesRepository, usersRepository, fakeEventBus);
  });

  it('cancels an active vote and publishes an event', async () => {
    const user = makeUser();
    usersRepository.items.push(user);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      placePublicId: 'place-1',
      day: new Date('2026-07-16'),
    });

    expect(result.isSuccess()).toBe(true);
    expect(cancelVote).toHaveBeenCalled();
    expect(fakeEventBus.events).toContainEqual(
      expect.objectContaining({ eventName: 'onde-hoje.place.vote-cancelled' }),
    );
  });

  it('fails when there is no active vote to cancel', async () => {
    const user = makeUser();
    usersRepository.items.push(user);
    cancelVote.mockResolvedValue(null);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      placePublicId: 'place-1',
      day: new Date('2026-07-16'),
    });

    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({
      currentUserPublicId: 'non-existing-public-id',
      placePublicId: 'place-1',
      day: new Date('2026-07-16'),
    });

    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
