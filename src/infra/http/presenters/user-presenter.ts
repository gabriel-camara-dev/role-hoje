import type { UserRole } from '@/@types/prisma/enums';

type PublicUser = {
  publicId: string;
  name: string;
  username: string;
  email: string;
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
      role: input.role,
      avatarUrl: input.avatarUpdatedAt ? `/users/${input.publicId}/avatar` : null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }
}
