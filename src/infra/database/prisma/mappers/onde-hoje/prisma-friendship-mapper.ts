import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { Friendship, type FriendshipStatus } from '@/domain/main/enterprise/entities/onde-hoje/friendships/friendship';
import type { Prisma } from '@/@types/prisma/client';

export interface RawFriendshipWithUsers {
  status: FriendshipStatus;
  createdAt: Date;
  requester: { publicId: string };
  addressee: { publicId: string };
}

/** Both sides arrive as publicIds; the domain never sees the internal user ids. */
export const friendshipWithUsersInclude = {
  requester: { select: { publicId: true } },
  addressee: { select: { publicId: true } },
} satisfies Prisma.FriendshipInclude;

/** The unordered pair identity persisted in the `pair_key` unique column. */
export function friendshipPairKey(requesterPublicId: string, addresseePublicId: string) {
  return [requesterPublicId, addresseePublicId].sort().join(':');
}

export class PrismaFriendshipMapper {
  static toDomain(raw: RawFriendshipWithUsers): Friendship {
    return Friendship.create({
      requesterId: new UniqueEntityID(raw.requester.publicId),
      addresseeId: new UniqueEntityID(raw.addressee.publicId),
      status: raw.status,
      createdAt: raw.createdAt,
    });
  }

  static toPrismaCreate(friendship: Friendship): Prisma.FriendshipCreateInput {
    return {
      pairKey: friendship.pairKey,
      status: friendship.status,
      createdAt: friendship.createdAt,
      requester: { connect: { publicId: friendship.requesterId.toString() } },
      addressee: { connect: { publicId: friendship.addresseeId.toString() } },
    };
  }
}
