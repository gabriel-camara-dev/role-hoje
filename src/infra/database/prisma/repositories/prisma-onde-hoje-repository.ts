import { Inject, Injectable } from '@nestjs/common';
import type { AdminDashboard } from '@/domain/main/enterprise/entities/onde-hoje/admin/admin-dashboard';
import type {
  FriendListItem,
  FriendshipStatus,
} from '@/domain/main/enterprise/entities/onde-hoje/friendships/friendship';
import type { CreateGroupData, Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import type { GroupMembership } from '@/domain/main/enterprise/entities/onde-hoje/groups/group-membership';
import type { CreatePlaceData, Place } from '@/domain/main/enterprise/entities/onde-hoje/places/place';
import type { PlaceVote } from '@/domain/main/enterprise/entities/onde-hoje/places/place-vote';
import type { TodayMapPlace } from '@/domain/main/enterprise/entities/onde-hoje/places/today-map-place';
import type { AdminDashboardRepository } from '@/domain/main/application/repositories/onde-hoje/admin-dashboard-repository';
import type { FriendshipsRepository } from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
import type {
  GroupsRepository,
  ListPublicGroupsQuery,
} from '@/domain/main/application/repositories/onde-hoje/groups-repository';
import type { OndeHojeUsersRepository } from '@/domain/main/application/repositories/onde-hoje/onde-hoje-users-repository';
import type {
  ListPlacesQuery,
  PlacesRepository,
  TodayMapQuery,
} from '@/domain/main/application/repositories/onde-hoje/places-repository';
import type { User } from '@/domain/main/enterprise/entities/user';
import { PrismaUserMapper } from '../mappers/prisma-user-mapper';
import { PrismaOndeHojeMapper } from '../mappers/prisma-onde-hoje-mapper';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaOndeHojeRepository
  implements
    PlacesRepository,
    GroupsRepository,
    FriendshipsRepository,
    AdminDashboardRepository,
    OndeHojeUsersRepository
{
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async findByPublicId(publicId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { publicId } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async list(query: ListPlacesQuery): Promise<Place[]> {
    const places = await this.prisma.place.findMany({
      where: {
        isActive: true,
        ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { formattedAddress: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return places.map((place) => PrismaOndeHojeMapper.placeToDomain(place));
  }

  async upsert(data: CreatePlaceData): Promise<Place> {
    const place = await this.prisma.place.upsert({
      where: { googlePlaceId: data.googlePlaceId },
      update: {
        name: data.name,
        formattedAddress: data.formattedAddress,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        state: data.state,
        country: data.country,
        photoUrl: data.photoUrl,
        websiteUrl: data.websiteUrl,
        mapsUrl: data.mapsUrl,
        isActive: true,
      },
      create: data,
    });

    return PrismaOndeHojeMapper.placeToDomain(place);
  }

  async todayMap(query: TodayMapQuery): Promise<TodayMapPlace[]> {
    const day = todayDate();
    const group = query.groupPublicId
      ? await this.prisma.group.findUnique({ where: { publicId: query.groupPublicId } })
      : null;

    const places = await this.prisma.place.findMany({
      where: {
        isActive: true,
        ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
        votes: {
          some: {
            day,
            status: 'ACTIVE',
            ...(group ? { groupId: group.id } : { groupId: null }),
          },
        },
      },
      include: {
        votes: {
          where: {
            day,
            status: 'ACTIVE',
            ...(group ? { groupId: group.id } : { groupId: null }),
          },
          include: {
            user: {
              select: {
                publicId: true,
                name: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return places
      .map((place) => ({
        ...PrismaOndeHojeMapper.placeToDomain(place),
        voteCount: place.votes.length,
        voters: place.votes.slice(0, 8).map((vote) => ({
          publicId: vote.user.publicId,
          name: vote.user.name,
          username: vote.user.username,
          note: vote.note,
        })),
      }))
      .sort((a, b) => b.voteCount - a.voteCount);
  }

  async voteToday(data: {
    userId: number;
    placePublicId: string;
    groupPublicId?: string;
    note?: string;
  }): Promise<PlaceVote | null> {
    const [place, group] = await Promise.all([
      this.prisma.place.findUnique({ where: { publicId: data.placePublicId } }),
      data.groupPublicId ? this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } }) : null,
    ]);

    if (!place || (data.groupPublicId && !group)) {
      return null;
    }

    const vote = await this.prisma.placeVote.upsert({
      where: {
        uq_vote_user_place_scope_day: {
          userId: data.userId,
          placeId: place.id,
          scopeKey: group?.publicId ?? 'global',
          day: todayDate(),
        },
      },
      update: {
        note: data.note,
        status: 'ACTIVE',
      },
      create: {
        userId: data.userId,
        placeId: place.id,
        groupId: group?.id,
        scopeKey: group?.publicId ?? 'global',
        day: todayDate(),
        note: data.note,
      },
    });

    return {
      publicId: vote.publicId,
      day: vote.day,
      status: vote.status,
    };
  }

  async listPublic(query: ListPublicGroupsQuery): Promise<Group[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        privacy: 'PUBLIC',
        ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      },
      include: {
        _count: {
          select: { members: true, votes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return groups.map((group) => PrismaOndeHojeMapper.groupToDomain(group));
  }

  async create(data: CreateGroupData): Promise<Group> {
    const group = await this.prisma.group.create({
      data: {
        ...data,
        slug: `${slugify(data.name)}-${Date.now().toString(36)}`,
        members: {
          create: {
            userId: data.createdById,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        },
      },
    });

    return PrismaOndeHojeMapper.groupToDomain(group);
  }

  async join(data: { userId: number; groupPublicId: string }): Promise<GroupMembership | null> {
    const group = await this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } });

    if (!group) {
      return null;
    }

    const member = await this.prisma.groupMember.upsert({
      where: {
        uq_group_member: {
          groupId: group.id,
          userId: data.userId,
        },
      },
      update: {
        status: group.privacy === 'PUBLIC' ? 'ACTIVE' : 'PENDING',
      },
      create: {
        groupId: group.id,
        userId: data.userId,
        status: group.privacy === 'PUBLIC' ? 'ACTIVE' : 'PENDING',
      },
    });

    return {
      groupPublicId: group.publicId,
      status: member.status,
    };
  }

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

  async getDashboard(): Promise<AdminDashboard> {
    const day = todayDate();
    const [usersCount, placesCount, groupsCount, todayVotesCount, openReportsCount, topPlaces] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.place.count({ where: { isActive: true } }),
      this.prisma.group.count(),
      this.prisma.placeVote.count({ where: { day, status: 'ACTIVE' } }),
      this.prisma.moderationReport.count({ where: { status: 'OPEN' } }),
      this.prisma.place.findMany({
        where: {
          votes: {
            some: { day, status: 'ACTIVE' },
          },
        },
        include: {
          _count: {
            select: {
              votes: {
                where: { day, status: 'ACTIVE' },
              },
            },
          },
        },
        take: 10,
      }),
    ]);

    return {
      usersCount,
      placesCount,
      groupsCount,
      todayVotesCount,
      openReportsCount,
      topPlaces: topPlaces
        .map((place) => ({
          publicId: place.publicId,
          name: place.name,
          city: place.city,
          votesCount: place._count.votes,
        }))
        .sort((a, b) => b.votesCount - a.votesCount),
    };
  }
}

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
