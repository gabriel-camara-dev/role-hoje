import { emailVerificationTokenHash, generateEmailVerificationToken } from './email-verification-token';

describe('Email Verification Token', () => {
  it('hashes a token deterministically', () => {
    expect(emailVerificationTokenHash('abc')).toBe(emailVerificationTokenHash('abc'));
    expect(emailVerificationTokenHash('abc')).not.toBe(emailVerificationTokenHash('xyz'));
  });

  it('generates a token whose hash matches the raw token, with a future expiry', () => {
    const { token, tokenHash, expiresAt } = generateEmailVerificationToken();

    expect(emailVerificationTokenHash(token)).toBe(tokenHash);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
