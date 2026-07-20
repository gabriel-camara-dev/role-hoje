import { UserAlreadyExistsError } from './errors/user-already-exists-error';
import { RegisterUserUseCase } from './register-user';
import { FakePasswordHasher } from '@test/cryptography/fake-password-hasher';
import { FakeEventBus } from '@test/events/fake-event-bus';
import { makeUser } from '@test/factories/make-user';
import { FakeEmailSender } from '@test/mail/fake-email-sender';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let emailSender: FakeEmailSender;
let fakeEventBus: FakeEventBus;
let sut: RegisterUserUseCase;

describe('Register User', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    emailSender = new FakeEmailSender();
    fakeEventBus = new FakeEventBus();
    sut = new RegisterUserUseCase(usersRepository, new FakePasswordHasher(), fakeEventBus, emailSender);
  });

  it('registers a user, hashing the password and storing a verification token', async () => {
    const result = await sut.execute({
      name: 'Ana',
      username: 'ana',
      email: 'ana@test.dev',
      password: 'segredo',
    });

    expect(result.isSuccess()).toBe(true);
    expect(usersRepository.items).toHaveLength(1);

    const [user] = usersRepository.items;

    expect(user.passwordHash).toBe('segredo-hashed');
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.emailVerificationTokenHash).not.toBeNull();
  });

  it('sends the confirmation email and publishes a domain event', async () => {
    await sut.execute({ name: 'Ana', username: 'ana', email: 'ana@test.dev', password: 'segredo' });

    expect(emailSender.sent).toEqual([expect.objectContaining({ email: 'ana@test.dev', name: 'Ana' })]);
    expect(fakeEventBus.events).toContainEqual(expect.objectContaining({ eventName: 'user.created' }));
  });

  it('rejects a duplicate email', async () => {
    usersRepository.items.push(makeUser({ email: 'ana@test.dev' }));

    const result = await sut.execute({
      name: 'Outra',
      username: 'outra',
      email: 'ana@test.dev',
      password: 'segredo',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(UserAlreadyExistsError);
  });

  it('rejects a duplicate username', async () => {
    usersRepository.items.push(makeUser({ username: 'ana' }));

    const result = await sut.execute({
      name: 'Ana',
      username: 'ana',
      email: 'nova@test.dev',
      password: 'segredo',
    });

    expect(result.isFail()).toBe(true);
    expect((result as { value: unknown }).value).toBeInstanceOf(UserAlreadyExistsError);
  });
});
