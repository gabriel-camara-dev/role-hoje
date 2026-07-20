import { DeleteExpiredUnverifiedUsersUseCase } from './delete-expired-unverified-users';
import { makeUser } from '@test/factories/make-user';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let sut: DeleteExpiredUnverifiedUsersUseCase;

describe('Delete Expired Unverified Users', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    sut = new DeleteExpiredUnverifiedUsersUseCase(usersRepository);
  });

  it('deletes unverified users whose token has expired', async () => {
    const expired = makeUser({ emailVerifiedAt: null, emailVerificationTokenExpiresAt: new Date(Date.now() - 1000) });
    const stillValid = makeUser({
      emailVerifiedAt: null,
      emailVerificationTokenExpiresAt: new Date(Date.now() + 10000),
    });
    const verified = makeUser({
      emailVerifiedAt: new Date(),
      emailVerificationTokenExpiresAt: new Date(Date.now() - 1000),
    });
    usersRepository.items.push(expired, stillValid, verified);

    const result = await sut.execute();

    expect(result.deletedCount).toBe(1);
    expect(usersRepository.items.map((user) => user.publicId)).toEqual([stillValid.publicId, verified.publicId]);
  });

  it('reports zero when nothing has expired', async () => {
    usersRepository.items.push(makeUser({ emailVerifiedAt: new Date() }));

    const result = await sut.execute();

    expect(result.deletedCount).toBe(0);
  });
});
