import type { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { GetUserVoteHistoryUseCase } from './get-user-vote-history';
import { makeUser } from '@test/factories/make-user';
import { InMemoryOndeHojeUsersRepository } from '@test/repositories/in-memory-onde-hoje-users-repository';

let usersRepository: InMemoryOndeHojeUsersRepository;
let userVoteHistory: ReturnType<typeof vi.fn>;
let placesRepository: PlacesRepository;
let sut: GetUserVoteHistoryUseCase;

describe('Get User Vote History', () => {
  beforeEach(() => {
    usersRepository = new InMemoryOndeHojeUsersRepository();
    userVoteHistory = vi.fn(async () => []);
    // Only userVoteHistory is exercised, so a partial stub stands in for the repo.
    placesRepository = { userVoteHistory } as unknown as PlacesRepository;
    sut = new GetUserVoteHistoryUseCase(placesRepository, usersRepository);
  });

  it('returns the target user summary and their vote history for an admin', async () => {
    const admin = makeUser({ role: 'ADMIN' });
    const target = makeUser();
    usersRepository.items.push(admin, target);

    const result = await sut.execute({
      currentUserPublicId: admin.publicId,
      targetUserPublicId: target.publicId,
      limit: 10,
    });

    expect(result.isSuccess()).toBe(true);
    expect((result as { value: { user: { publicId: string } } }).value.user.publicId).toBe(target.publicId);
    expect(userVoteHistory).toHaveBeenCalledWith(target.publicId, 10);
  });

  it('forbids a non-admin', async () => {
    const user = makeUser({ role: 'DEFAULT' });
    const target = makeUser();
    usersRepository.items.push(user, target);

    const result = await sut.execute({
      currentUserPublicId: user.publicId,
      targetUserPublicId: target.publicId,
    });

    expect((result as { value: unknown }).value).toBeInstanceOf(ForbiddenError);
  });

  it('fails when the target user does not exist', async () => {
    const admin = makeUser({ role: 'ADMIN' });
    usersRepository.items.push(admin);

    const result = await sut.execute({
      currentUserPublicId: admin.publicId,
      targetUserPublicId: 'non-existing-public-id',
    });

    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('fails for an unknown authenticated user', async () => {
    const result = await sut.execute({
      currentUserPublicId: 'non-existing-public-id',
      targetUserPublicId: 'whoever',
    });

    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
