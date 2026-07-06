import { createHash, randomBytes } from 'node:crypto';

const tokenTtlInMs = 1000 * 60 * 5;

export function emailVerificationTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateEmailVerificationToken() {
  const token = randomBytes(32).toString('base64url');

  return {
    token,
    tokenHash: emailVerificationTokenHash(token),
    expiresAt: new Date(Date.now() + tokenTtlInMs),
  };
}
