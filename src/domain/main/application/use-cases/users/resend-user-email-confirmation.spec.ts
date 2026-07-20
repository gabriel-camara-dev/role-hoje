import { ResendUserEmailConfirmationUseCase } from './resend-user-email-confirmation';
import { makeUser } from '@test/factories/make-user';
import { FakeEmailSender } from '@test/mail/fake-email-sender';
import { InMemoryUsersRepository } from '@test/repositories/in-memory-users-repository';

let usersRepository: InMemoryUsersRepository;
let emailSender: FakeEmailSender;
let sut: ResendUserEmailConfirmationUseCase;

describe('Resend User Email Confirmation', () => {
  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    emailSender = new FakeEmailSender();
    sut = new ResendUserEmailConfirmationUseCase(usersRepository, emailSender);
  });

  it('re-sends the confirmation with a fresh token for an unverified user', async () => {
    const user = makeUser({ email: 'ana@test.dev', emailVerifiedAt: null, emailVerificationTokenHash: 'old' });
    usersRepository.items.push(user);

    const result = await sut.execute({ email: 'ana@test.dev' });

    expect(result.isSuccess()).toBe(true);
    expect(emailSender.sent).toHaveLength(1);
    expect(usersRepository.items[0].emailVerificationTokenHash).not.toBe('old');
  });

  it('stays silent (no email) for an already verified user', async () => {
    usersRepository.items.push(makeUser({ email: 'ana@test.dev', emailVerifiedAt: new Date() }));

    const result = await sut.execute({ email: 'ana@test.dev' });

    expect(result.isSuccess()).toBe(true);
    expect(emailSender.sent).toHaveLength(0);
  });

  it('stays silent for an unknown email (no account enumeration)', async () => {
    const result = await sut.execute({ email: 'ghost@test.dev' });

    expect(result.isSuccess()).toBe(true);
    expect(emailSender.sent).toHaveLength(0);
  });
});
