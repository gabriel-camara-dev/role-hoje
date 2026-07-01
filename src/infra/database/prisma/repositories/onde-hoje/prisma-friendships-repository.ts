import { Inject, Injectable } from '@nestjs/common';
import type {
  FriendListItem,
  FriendshipStatus,
} from '@/domain/main/enterprise/entities/onde-hoje/friendships/friendship';
import type { FriendshipsRepository } from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
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
        requester: { select: { publicId: true, name: true, username: true } },
        addressee: { select: { publicId: true, name: true, username: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return friendships.map((friendship) => ({
      status: friendship.status,
      direction: friendship.requesterId === userId ? 'sent' : 'received',
      friend: friendship.requesterId === userId ? friendship.addressee : friendship.requester,
    }));
  }

  async requestFriendship(data: { requesterId: number; addresseePublicId: string }): Promise<FriendshipStatus | null> {
    const friend = await this.prisma.user.findUnique({ where: { publicId: data.addresseePublicId } });

    if (!friend || friend.id === data.requesterId) {
      return null;
    }

    const friendship = await this.prisma.friendship.upsert({
      where: {
        uq_friendship_pair: {
          requesterId: data.requesterId,
          addresseeId: friend.id,
        },
      },
      update: { status: 'PENDING' },
      create: {
        requesterId: data.requesterId,
        addresseeId: friend.id,
      },
    });

    return friendship.status;
  }

  async acceptFriendship(data: { addresseeId: number; requesterPublicId: string }): Promise<FriendshipStatus | null> {
    const requester = await this.prisma.user.findUnique({ where: { publicId: data.requesterPublicId } });

    if (!requester) {
      return null;
    }

    const friendship = await this.prisma.friendship.update({
      where: {
        uq_friendship_pair: {
          requesterId: requester.id,
          addresseeId: data.addresseeId,
        },
      },
      data: { status: 'ACCEPTED' },
    });

    return friendship.status;
  }
}
