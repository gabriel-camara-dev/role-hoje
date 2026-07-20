import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { DomainEvents } from '@/core/events/domain-events';
import { AppModule } from '@/app.module';
import { EmailSender } from '@/domain/main/application/mail/email-sender';
import type { UserRole } from '@/domain/main/enterprise/entities/user-role';
import { PrismaService } from '@/infra/database/prisma/prisma.service';

/** Boots the full Nest app with the email sender stubbed out. */
export async function createTestApp(): Promise<INestApplication> {
  // e2e files share one worker (singleFork). Wipe handlers a previous app's
  // subscribers registered so only this app's subscribers stay live.
  DomainEvents.clearHandlers();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailSender)
    .useValue({ sendEmailConfirmation: async () => undefined })
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

export function prismaFrom(app: INestApplication): PrismaService {
  return app.get(PrismaService);
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const TEST_PASSWORD = 'Str0ng!Pass';

export interface TestUser {
  id: number;
  publicId: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
}

interface CreateUserOverrides {
  role?: UserRole;
  emailVerified?: boolean;
  password?: string;
}

/** Inserts a ready-to-use (email-verified) user and mints a JWT for it. */
export async function createUser(
  app: INestApplication,
  overrides: CreateUserOverrides = {},
): Promise<{ user: TestUser; token: string }> {
  const prisma = prismaFrom(app);
  const jwt = app.get(JwtService);
  const suffix = randomSuffix();

  const user = await prisma.user.create({
    data: {
      name: `Test User ${suffix}`,
      username: `user_${suffix}`,
      email: `user_${suffix}@test.dev`,
      passwordHash: await hash(overrides.password ?? TEST_PASSWORD, 8),
      emailVerifiedAt: overrides.emailVerified === false ? null : new Date(),
      role: overrides.role ?? 'DEFAULT',
    },
    select: { id: true, publicId: true, email: true, username: true, name: true, role: true },
  });

  const token = jwt.sign({ sub: user.publicId, role: user.role });
  return { user, token };
}

export function bearer(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

/** Inserts an active place directly. */
export async function createPlace(
  app: INestApplication,
  overrides: { name?: string; city?: string } = {},
): Promise<{ id: number; publicId: string; name: string; city: string | null }> {
  const suffix = randomSuffix();
  return prismaFrom(app).place.create({
    data: {
      googlePlaceId: `test-place-${suffix}`,
      name: overrides.name ?? `Place ${suffix}`,
      formattedAddress: 'Rua de Teste, 100',
      latitude: -22.9,
      longitude: -43.1,
      city: overrides.city ?? 'Niteroi',
      state: 'RJ',
    },
    select: { id: true, publicId: true, name: true, city: true },
  });
}

/** Inserts a group owned by `ownerId` (OWNER + ACTIVE membership). */
export async function createGroup(
  app: INestApplication,
  ownerId: number,
  overrides: { privacy?: 'PUBLIC' | 'PRIVATE'; city?: string } = {},
): Promise<{ id: number; publicId: string; name: string }> {
  const suffix = randomSuffix();
  return prismaFrom(app).group.create({
    data: {
      name: `Group ${suffix}`,
      slug: `group-${suffix}`,
      privacy: overrides.privacy ?? 'PUBLIC',
      city: overrides.city ?? 'Niteroi',
      createdById: ownerId,
      members: { create: { userId: ownerId, role: 'OWNER', status: 'ACTIVE' } },
    },
    select: { id: true, publicId: true, name: true },
  });
}
