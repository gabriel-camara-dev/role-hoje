import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { USER_ROLES, type User } from '@/domain/main/enterprise/entities/user';

let nextId = 1;

export function makeUser(override: Partial<User> = {}): User {
  const now = new Date();

  return {
    id: nextId++,
    publicId: randomUUID(),
    name: faker.person.fullName(),
    username: faker.internet.username().toLowerCase().replace(/[^a-z0-9._]/g, ''),
    email: faker.internet.email().toLowerCase(),
    passwordHash: faker.string.alphanumeric(60),
    googleId: null,
    avatarEncryptedPath: null,
    avatarIv: null,
    avatarAuthTag: null,
    avatarMimeType: null,
    avatarOriginalName: null,
    avatarUpdatedAt: null,
    loginAttempts: 0,
    lastLogin: null,
    role: USER_ROLES.DEFAULT,
    token: null,
    tokenExpiresAt: null,
    emailVerifiedAt: now,
    emailVerificationTokenHash: null,
    emailVerificationTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
    passwordChangedAt: null,
    ...override,
  };
}
