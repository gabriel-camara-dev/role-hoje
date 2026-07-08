import { Inject, Injectable } from '@nestjs/common';
import type { FriendListItem } from '@/domain/main/enterprise/entities/onde-hoje/friendships/friendship';
import type {
  AcceptFriendshipResult,
  FriendshipsRepository,
  RequestFriendshipResult,
} from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PrismaFriendshipsRepository implements FriendshipsRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async listFriends(userId: number): Promise<FriendListItem[]> {
    const friendships = await this.prisma.friendship.findMany({
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

  async requestFriendship(data: { requesterId: number; addresseeUsername: string }): Promise<RequestFriendshipResult> {
    const friend = await this.prisma.user.findUnique({ where: { username: data.addresseeUsername } });

    if (!friend || friend.id === data.requesterId) {
      return { type: 'not_found' };
    }

    const pairKey = friendshipPairKey(data.requesterId, friend.id);
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [{ pairKey }, { requesterId: friend.id, addresseeId: data.requesterId }],
      },
    });

    if (existing?.status === 'ACCEPTED' || existing?.status === 'BLOCKED') {
      return { type: 'already_exists', status: existing.status };
    }

    const friendship = await this.prisma.friendship.upsert({
      where: {
        pairKey,
      },
      update: { status: 'PENDING' },
      create: {
        requesterId: data.requesterId,
        addresseeId: friend.id,
        pairKey,
      },
    });

    return { type: 'requested', status: friendship.status, addresseePublicId: friend.publicId };
  }

  async acceptFriendship(data: {
    addresseeId: number;
    requesterUsername: string;
  }): Promise<AcceptFriendshipResult | null> {
    const requester = await this.prisma.user.findUnique({ where: { username: data.requesterUsername } });

    if (!requester) {
      return null;
    }

    const updated = await this.prisma.friendship.updateMany({
      where: {
        requesterId: requester.id,
        addresseeId: data.addresseeId,
        status: 'PENDING',
      },
      data: { status: 'ACCEPTED' },
    });

    if (updated.count === 0) {
      return null;
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        requesterId: requester.id,
        addresseeId: data.addresseeId,
      },
    });

    if (!friendship) {
      return null;
    }

    return { status: friendship.status, requesterPublicId: requester.publicId };
  }

  async rejectFriendship(data: { addresseeId: number; requesterUsername: string }): Promise<boolean> {
    const requester = await this.prisma.user.findUnique({ where: { username: data.requesterUsername } });

    if (!requester) {
      return false;
    }

    const deleted = await this.prisma.friendship.deleteMany({
      where: {
        requesterId: requester.id,
        addresseeId: data.addresseeId,
        status: 'PENDING',
      },
    });

    return deleted.count > 0;
  }
}

function friendshipPairKey(firstUserId: number, secondUserId: number) {
  return [firstUserId, secondUserId].sort((a, b) => a - b).join(':');
}
