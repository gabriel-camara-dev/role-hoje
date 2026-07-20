import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import type { Prisma } from '@/@types/prisma/client';

export interface RawGroupWithOwner {
  publicId: string;
  name: string;
  slug: string;
  description: string | null;
  privacy: 'PUBLIC' | 'PRIVATE';
  passwordHash: string | null;
  city: string | null;
  state: string | null;
  createdAt: Date;
  createdBy: { publicId: string };
}

/** Every group read has to carry the owner's publicId: the domain never sees `createdById`. */
export const groupWithOwnerInclude = {
  createdBy: { select: { publicId: true } },
} satisfies Prisma.GroupInclude;

export class PrismaGroupMapper {
  static toDomain(raw: RawGroupWithOwner): Group {
    return Group.create(
      {
        name: raw.name,
        slug: raw.slug,
        description: raw.description,
        privacy: raw.privacy,
        passwordHash: raw.passwordHash,
        city: raw.city,
        state: raw.state,
        ownerId: new UniqueEntityID(raw.createdBy.publicId),
        createdAt: raw.createdAt,
      },
      new UniqueEntityID(raw.publicId),
    );
  }

  /**
   * The owner arrives as a publicId, so it is written through a `connect` on the
   * unique column instead of an id lookup.
   */
  static toPrismaCreate(group: Group): Prisma.GroupCreateInput {
    return {
      publicId: group.id.toString(),
      name: group.name,
      slug: group.slug,
      description: group.description,
      privacy: group.privacy,
      passwordHash: group.passwordHash,
      city: group.city,
      state: group.state,
      createdAt: group.createdAt,
      createdBy: { connect: { publicId: group.ownerId.toString() } },
    };
  }

  static toPrismaUpdate(group: Group): Prisma.GroupUpdateInput {
    return {
      name: group.name,
      slug: group.slug,
      description: group.description,
      privacy: group.privacy,
      passwordHash: group.passwordHash,
      city: group.city,
      state: group.state,
      createdBy: { connect: { publicId: group.ownerId.toString() } },
    };
  }
}
