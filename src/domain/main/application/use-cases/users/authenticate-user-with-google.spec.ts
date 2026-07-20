import { AuthenticateUserWithGoogleUseCase } from './authenticate-user-with-google';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeUser } from '@test/factories/make-user';
import { InMemoryAuthenticationAuditRepository } from '@test/repositories/in-memory-authentication-audit-repository';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let auditRepository: InMemoryAuthenticationAuditRepository;
let fakeEventBus: FakeEventBus;
let sut: AuthenticateUserWithGoogleUseCase;

function userOf(result: unknown) {
  return (result as { value: { user: { publicId: string; googleId: string | null; username: string } } }).value.user;
}

describe('Authenticate User With Google', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    auditRepository = new InMemoryAuthenticationAuditRepository();
    fakeEventBus = new FakeEventBus();
    sut = new AuthenticateUserWithGoogleUseCase(usersRepository, auditRepository, fakeEventBus);
  });

  it('signs in an existing user matched by googleId', async () => {
    const user = makeUser({ googleId: 'google-123' });
    usersRepository.items.push(user);

    const result = await sut.execute({ googleId: 'google-123', email: user.email, name: user.name });

    expect(userOf(result).publicId).toBe(user.publicId);
    expect(usersRepository.items).toHaveLength(1);
    expect(auditRepository.items).toContainEqual(expect.objectContaining({ status: 'SUCCESS' }));
  });

  it('links google to an existing account matched by email', async () => {
    const user = makeUser({ email: 'ana@test.dev', googleId: null });
    usersRepository.items.push(user);

    const result = await sut.execute({ googleId: 'google-123', email: 'ana@test.dev', name: user.name });

    expect(userOf(result).publicId).toBe(user.publicId);
    expect(usersRepository.items[0].googleId).toBe('google-123');
    expect(usersRepository.items).toHaveLength(1);
  });

  it('creates a verified user when there is no match, deriving a username from the email', async () => {
    const result = await sut.execute({ googleId: 'google-123', email: 'ana.silva@test.dev', name: 'Ana Silva' });

    expect(usersRepository.items).toHaveLength(1);
    expect(userOf(result).username).toBe('ana_silva');
    expect(usersRepository.items[0].emailVerifiedAt).not.toBeNull();
    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'user.created-with-google' }));
  });

  it('avoids a username collision by suffixing', async () => {
    usersRepository.items.push(makeUser({ username: 'ana' }));

    const result = await sut.execute({ googleId: 'google-123', email: 'ana@test.dev', name: 'Ana' });

    expect(userOf(result).username).toBe('ana_2');
  });
});
