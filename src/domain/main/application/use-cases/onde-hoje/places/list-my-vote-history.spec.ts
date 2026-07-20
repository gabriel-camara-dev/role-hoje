import type { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import type { UserVoteHistoryItem } from '../../../../enterprise/entities/onde-hoje/places/place-history';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { ListMyVoteHistoryUseCase } from './list-my-vote-history';
import { makeUser } from '@test/factories/make-user';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let userVoteHistory: ReturnType<typeof vi.fn>;
let sut: ListMyVoteHistoryUseCase;

describe('List My Vote History', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    userVoteHistory = vi.fn(async () => [] as UserVoteHistoryItem[]);
    sut = new ListMyVoteHistoryUseCase({ userVoteHistory } as unknown as PlacesRepository, usersRepository);
  });

  it('returns the caller vote history, defaulting the limit to 30', async () => {
    const user = makeUser();
    usersRepository.items.push(user);

    const result = await sut.execute({ currentUserPublicId: user.publicId });

    expect(result.isSuccess()).toBe(true);
    expect(userVoteHistory).toHaveBeenCalledWith(user.publicId, 30);
  });

  it('honours a custom limit', async () => {
    const user = makeUser();
    usersRepository.items.push(user);

    await sut.execute({ currentUserPublicId: user.publicId, limit: 5 });

    expect(userVoteHistory).toHaveBeenCalledWith(user.publicId, 5);
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({ currentUserPublicId: 'non-existing-public-id' });

    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
