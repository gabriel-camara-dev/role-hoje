import { faker } from '@faker-js/faker';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { User, type UserProps } from '@/domain/main/enterprise/entities/user';

export function makeUser(override: Partial<UserProps> = {}, id?: UniqueEntityID) {
  const now = new Date();

  return User.create(
    {
      name: faker.person.fullName(),
      username: faker.internet
        .username()
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, ''),
      email: faker.internet.email().toLowerCase(),
      passwordHash: faker.string.alphanumeric(60),
      googleId: null,
      loginAttempts: 0,
      lastLogin: null,
      role: 'DEFAULT',
      emailVerifiedAt: now,
      ...override,
    },
    id,
  );
}
