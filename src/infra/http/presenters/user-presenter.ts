import type { UserRole } from '@/@types/prisma/enums';

type PublicUser = {
  publicId: string;
  name: string;
  username: string;
  email: string;
  emailVerifiedAt: Date | null;
  role: UserRole;
  avatarUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type HTTPUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerifiedAt: Date | null;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class UserPresenter {
  static toHTTP(user: PublicUser): HTTPUser;
  static toHTTP(users: PublicUser[]): HTTPUser[];
  static toHTTP(input: PublicUser | PublicUser[]): HTTPUser | HTTPUser[] {
    if (Array.isArray(input)) {
      return input.map((user) => UserPresenter.toHTTP(user));
    }

    return {
      id: input.publicId,
      name: input.name,
      username: input.username,
      email: input.email,
      emailVerifiedAt: input.emailVerifiedAt,
      role: input.role,
      avatarUrl: input.avatarUpdatedAt
        ? `/users/${input.publicId}/avatar?v=${input.avatarUpdatedAt.getTime()}`
        : null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }
}
