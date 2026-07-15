import { Inject, Injectable } from '@nestjs/common';
import type { FriendListItem, FriendshipStatus } from '@/domain/main/enterprise/entities/onde-hoje/friendships/friendship';
import {
  FriendshipsRepository,
  type RequestFriendshipResult,
} from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
import { DatabaseContext } from '../../database-context';

@Injectable()
export class PrismaFriendshipsRepository extends FriendshipsRepository {
  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {
    super();
  }

  async listFriends(userId: number): Promise<FriendListItem[]> {
    const friendships = await this.dbContext.client.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { publicId: true, name: true, username: true, avatarUpdatedAt: true } },
        addressee: { select: { publicId: true, name: true, username: true, avatarUpdatedAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return friendships.map((friendship) => {
      const friend = friendship.requesterId === userId ? friendship.addressee : friendship.requester;

      return {
        status: friendship.status,
        direction: friendship.requesterId === userId ? 'sent' : 'received',
        friend: {
          publicId: friend.publicId,
          name: friend.name,
          username: friend.username,
          avatarUrl: friend.avatarUpdatedAt
            ? `/users/${friend.publicId}/avatar?v=${friend.avatarUpdatedAt.getTime()}`
            : null,
        },
      };
    });
  }

  async requestFriendship(data: { requesterId: number; addresseeId: number }): Promise<RequestFriendshipResult> {
    const pairKey = friendshipPairKey(data.requesterId, data.addresseeId);
    const existing = await this.dbContext.client.friendship.findFirst({
      where: {
        OR: [{ pairKey }, { requesterId: data.addresseeId, addresseeId: data.requesterId }],
      },
    });

    if (existing?.status === 'ACCEPTED' || existing?.status === 'BLOCKED') {
      return { type: 'already_exists', status: existing.status };
    }

    const friendship = await this.dbContext.client.friendship.upsert({
      where: {
        pairKey,
      },
      update: { status: 'PENDING' },
      create: {
        requesterId: data.requesterId,
        addresseeId: data.addresseeId,
        pairKey,
      },
    });

    return { type: 'requested', status: friendship.status };
  }

  async acceptFriendship(data: { addresseeId: number; requesterId: number }): Promise<FriendshipStatus | null> {
    const updated = await this.dbContext.client.friendship.updateMany({
      where: {
        requesterId: data.requesterId,
        addresseeId: data.addresseeId,
        status: 'PENDING',
      },
      data: { status: 'ACCEPTED' },
    });

    if (updated.count === 0) {
      return null;
    }

    const friendship = await this.dbContext.client.friendship.findFirst({
      where: {
        requesterId: data.requesterId,
        addresseeId: data.addresseeId,
      },
    });

    return friendship?.status ?? null;
  }

  async rejectFriendship(data: { addresseeId: number; requesterId: number }): Promise<boolean> {
    const deleted = await this.dbContext.client.friendship.deleteMany({
      where: {
        requesterId: data.requesterId,
        addresseeId: data.addresseeId,
        status: 'PENDING',
      },
    });

    return deleted.count > 0;
  }

  async removeFriendship(data: { userId: number; otherId: number }): Promise<boolean> {
    const deleted = await this.dbContext.client.friendship.deleteMany({
      where: { pairKey: friendshipPairKey(data.userId, data.otherId) },
    });

    return deleted.count > 0;
  }
}

function friendshipPairKey(firstUserId: number, secondUserId: number) {
  return [firstUserId, secondUserId].sort((a, b) => a - b).join(':');
}
