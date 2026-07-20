import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { GetUserProfileUseCase } from './get-user-profile';
import { makeUser } from '@test/factories/make-user';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let sut: GetUserProfileUseCase;

describe('Get User Profile', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    sut = new GetUserProfileUseCase(usersRepository);
  });

  it('returns the user for a known publicId', async () => {
    const user = makeUser();
    usersRepository.items.push(user);

    const result = await sut.execute({ publicId: user.publicId });

    expect(result.isSuccess()).toBe(true);
    expect((result as { value: { user: { publicId: string } } }).value.user.publicId).toBe(user.publicId);
  });

  it('fails for an unknown publicId', async () => {
    const result = await sut.execute({ publicId: 'non-existing-public-id' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });
});
