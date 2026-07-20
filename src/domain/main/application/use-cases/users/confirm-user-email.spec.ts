import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { ConfirmUserEmailUseCase } from './confirm-user-email';
import { generateEmailVerificationToken } from './email-verification-token';
import { makeUser } from '@test/factories/make-user';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let sut: ConfirmUserEmailUseCase;

describe('Confirm User Email', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    sut = new ConfirmUserEmailUseCase(usersRepository);
  });

  it('verifies the email and clears the token for a valid link', async () => {
    const { token, tokenHash, expiresAt } = generateEmailVerificationToken();
    const user = makeUser({
      emailVerifiedAt: null,
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: expiresAt,
    });
    usersRepository.items.push(user);

    const result = await sut.execute({ token });

    expect(result.isSuccess()).toBe(true);
    expect(usersRepository.items[0].emailVerifiedAt).not.toBeNull();
    expect(usersRepository.items[0].emailVerificationTokenHash).toBeNull();
  });

  it('fails for an unknown token', async () => {
    const result = await sut.execute({ token: 'not-a-real-token' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('deletes the user and fails when the token has expired', async () => {
    const { token, tokenHash } = generateEmailVerificationToken();
    const user = makeUser({
      emailVerifiedAt: null,
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: new Date(Date.now() - 1000),
    });
    usersRepository.items.push(user);

    const result = await sut.execute({ token });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(ResourceNotFoundError);
    expect(usersRepository.items).toHaveLength(0);
  });
});
