import { Inject, Injectable } from '@nestjs/common';
import { DomainEvents } from '@/core/events/domain-events';
import type { FriendshipsRepository } from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
import type { FriendListItem, Friendship } from '@/domain/main/enterprise/entities/onde-hoje/friendships/friendship';
import { DatabaseContext } from '../../database-context';
import {
  friendshipPairKey,
  friendshipWithUsersInclude,
  PrismaFriendshipMapper,
} from '../../mappers/onde-hoje/prisma-friendship-mapper';

@Injectable()
export class PrismaFriendshipsRepository implements FriendshipsRepository {
  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {}

  async findByUsers(data: { requesterId: string; addresseeId: string }): Promise<Friendship | null> {
    const friendship = await this.dbContext.client.friendship.findUnique({
      where: { pairKey: friendshipPairKey(data.requesterId, data.addresseeId) },
      include: friendshipWithUsersInclude,
    });

    return friendship ? PrismaFriendshipMapper.toDomain(friendship) : null;
  }

  async create(friendship: Friendship): Promise<void> {
    await this.dbContext.client.friendship.create({
      data: PrismaFriendshipMapper.toPrismaCreate(friendship),
    });

    DomainEvents.dispatchEventsForAggregate(friendship.id);
  }

  async save(friendship: Friendship): Promise<void> {
    // The pair is stable, so a re-request that flips direction still lands on the
    // same row; update the direction along with the status.
    await this.dbContext.client.friendship.update({
      where: { pairKey: friendship.pairKey },
      data: {
        status: friendship.status,
        requester: { connect: { publicId: friendship.requesterId.toString() } },
        addressee: { connect: { publicId: friendship.addresseeId.toString() } },
      },
    });

    DomainEvents.dispatchEventsForAggregate(friendship.id);
  }

  async delete(friendship: Friendship): Promise<void> {
    await this.dbContext.client.friendship.deleteMany({ where: { pairKey: friendship.pairKey } });
  }

  async findManyByUserId(userId: string): Promise<FriendListItem[]> {
    const friendships = await this.dbContext.client.friendship.findMany({
      where: {
        OR: [{ requester: { publicId: userId } }, { addressee: { publicId: userId } }],
      },
      include: {
        requester: { select: { publicId: true, name: true, username: true, avatarUpdatedAt: true } },
        addressee: { select: { publicId: true, name: true, username: true, avatarUpdatedAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return friendships.map((friendship) => {
      const sent = friendship.requester.publicId === userId;
      const friend = sent ? friendship.addressee : friendship.requester;

      return {
        status: friendship.status,
        direction: sent ? 'sent' : 'received',
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
}
