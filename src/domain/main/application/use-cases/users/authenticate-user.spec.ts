import { hash } from 'bcryptjs';
import { InvalidCredentialsError } from '../errors/invalid-credentials-error';
import { AuthenticateUserUseCase } from './authenticate-user';
import { EmailNotVerifiedError } from './errors/email-not-verified-error';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeUser } from '@test/factories/make-user';
import { InMemoryAuthenticationAuditRepository } from '@test/repositories/in-memory-authentication-audit-repository';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let auditRepository: InMemoryAuthenticationAuditRepository;
let fakeEventBus: FakeEventBus;
let sut: AuthenticateUserUseCase;

describe('Authenticate User', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    auditRepository = new InMemoryAuthenticationAuditRepository();
    fakeEventBus = new FakeEventBus();
    sut = new AuthenticateUserUseCase(usersRepository, auditRepository, fakeEventBus);
  });

  it('authenticates a verified user with the right password', async () => {
    const passwordHash = await hash('segredo', 8);
    const user = makeUser({ email: 'ana@test.dev', passwordHash, emailVerifiedAt: new Date() });
    usersRepository.items.push(user);

    const result = await sut.execute({ login: 'ana@test.dev', password: 'segredo' });

    expect(result.isSuccess()).toBe(true);
    expect(auditRepository.items).toContainEqual(
      expect.objectContaining({ status: 'SUCCESS', userPublicId: user.publicId }),
    );
    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'user.authenticated' }));
  });

  it('records the login timestamp on success', async () => {
    const passwordHash = await hash('segredo', 8);
    const user = makeUser({ passwordHash, lastLogin: null, emailVerifiedAt: new Date() });
    usersRepository.items.push(user);

    await sut.execute({ login: user.username, password: 'segredo' });

    expect(usersRepository.items[0].lastLogin).not.toBeNull();
  });

  it('rejects a wrong password and audits it', async () => {
    const passwordHash = await hash('segredo', 8);
    const user = makeUser({ passwordHash, emailVerifiedAt: new Date() });
    usersRepository.items.push(user);

    const result = await sut.execute({ login: user.username, password: 'errado' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(InvalidCredentialsError);
    expect(auditRepository.items).toContainEqual(expect.objectContaining({ status: 'INCORRECT_PASSWORD' }));
  });

  it('rejects an unknown login and audits it as USER_NOT_EXISTS', async () => {
    const result = await sut.execute({ login: 'ghost@test.dev', password: 'segredo' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(InvalidCredentialsError);
    expect(auditRepository.items).toContainEqual(expect.objectContaining({ status: 'USER_NOT_EXISTS' }));
  });

  it('rejects a non-admin whose email is not verified', async () => {
    const passwordHash = await hash('segredo', 8);
    const user = makeUser({ passwordHash, emailVerifiedAt: null, role: 'DEFAULT' });
    usersRepository.items.push(user);

    const result = await sut.execute({ login: user.username, password: 'segredo' });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(EmailNotVerifiedError);
  });

  it('lets an unverified admin through', async () => {
    const passwordHash = await hash('segredo', 8);
    const user = makeUser({ passwordHash, emailVerifiedAt: null, role: 'ADMIN' });
    usersRepository.items.push(user);

    const result = await sut.execute({ login: user.username, password: 'segredo' });

    expect(result.isSuccess()).toBe(true);
  });
});
