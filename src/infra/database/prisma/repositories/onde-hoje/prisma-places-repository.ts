import { Inject, Injectable } from '@nestjs/common';
import type { PlaceAttendanceEstimate } from '@/domain/main/enterprise/entities/onde-hoje/places/place-attendance-estimate';
import type {
  PlaceHistoryDay,
  UserVoteHistoryItem,
} from '@/domain/main/enterprise/entities/onde-hoje/places/place-history';
import type { PlaceVote } from '@/domain/main/enterprise/entities/onde-hoje/places/place-vote';
import type { TodayMapPlace } from '@/domain/main/enterprise/entities/onde-hoje/places/today-map-place';
import type {
  ListPlacesQuery,
  GlobalTopPlacesQuery,
  PlaceAttendanceEstimateQuery,
  PlaceHistoryQuery,
  PlacesRepository,
  TodayMapQuery,
  TopPlacesTodayQuery,
} from '@/domain/main/application/repositories/onde-hoje/places-repository';
import type { CreatePlaceData, Place } from '@/domain/main/enterprise/entities/onde-hoje/places/place';
import { toDateOnly } from '@/core/date/date-only';
import { PrismaOndeHojeMapper } from '../../mappers/prisma-onde-hoje-mapper';
import { PrismaService } from '../../prisma.service';
import { getCoordinateBounds, getDistanceKm, todayDate, toDateKey } from './onde-hoje-prisma-utils';

@Injectable()
export class PrismaPlacesRepository implements PlacesRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async list(query: ListPlacesQuery): Promise<Place[]> {
    const radiusKm = query.radiusKm;
    const bounds =
      query.latitude !== undefined && query.longitude !== undefined && radiusKm !== undefined
        ? getCoordinateBounds(query.latitude, query.longitude, radiusKm)
        : null;

    const places = await this.prisma.place.findMany({
      where: {
        isActive: true,
        ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
        ...(bounds
          ? {
              latitude: { gte: bounds.minLatitude, lte: bounds.maxLatitude },
              longitude: { gte: bounds.minLongitude, lte: bounds.maxLongitude },
            }
          : {}),
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

    const mappedPlaces = places.map((place) =>
      this.withDistance(PrismaOndeHojeMapper.placeToDomain(place), query.latitude, query.longitude),
    );

    return radiusKm === undefined
      ? mappedPlaces
      : mappedPlaces
          .filter((place) => place.distanceKm !== undefined && place.distanceKm <= radiusKm)
          .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  async upsert(data: CreatePlaceData): Promise<Place> {
    const placeData = {
      googlePlaceId: data.googlePlaceId,
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
      createdById: data.createdById,
    };

    const place = await this.prisma.place.upsert({
      where: { googlePlaceId: data.googlePlaceId },
      update: {
        name: placeData.name,
        formattedAddress: placeData.formattedAddress,
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        city: placeData.city,
        state: placeData.state,
        country: placeData.country,
        photoUrl: placeData.photoUrl,
        websiteUrl: placeData.websiteUrl,
        mapsUrl: placeData.mapsUrl,
        isActive: true,
      },
      create: placeData,
    });

    return PrismaOndeHojeMapper.placeToDomain(place);
  }

  async todayMap(query: TodayMapQuery): Promise<TodayMapPlace[] | null> {
    const day = query.day ?? todayDate();
    const group = query.groupPublicId
      ? await this.prisma.group.findUnique({ where: { publicId: query.groupPublicId } })
      : null;

    if (query.groupPublicId && !group) {
      return null;
    }

    if (group?.privacy === 'PRIVATE') {
      const hasAccess = await this.isActiveGroupMember(group.id, query.viewerPublicId);

      if (!hasAccess) {
        return null;
      }
    }

    const places = await this.prisma.place.findMany({
      where: {
        isActive: true,
        ...(query.city ? cityOrFreeMapPointWhere(query.city) : {}),
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
                avatarUpdatedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const mappedPlaces = places
      .map((place) => ({
        ...PrismaOndeHojeMapper.placeToDomain(place),
        voteCount: place.votes.length,
        dominantVoteType: dominantVoteType(place.votes),
        voters: place.votes.slice(0, 8).map((vote) => ({
          publicId: vote.user.publicId,
          name: vote.user.name,
          username: vote.user.username,
          avatarUrl: this.avatarUrl(vote.user),
          note: vote.note,
          voteType: vote.voteType,
        })),
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    return this.withFriendshipStatuses(mappedPlaces, query.viewerPublicId);
  }

  async topPlacesToday(query: TopPlacesTodayQuery): Promise<TodayMapPlace[] | null> {
    const day = query.day ?? todayDate();
    const group = query.groupPublicId
      ? await this.prisma.group.findUnique({ where: { publicId: query.groupPublicId } })
      : null;

    if (query.groupPublicId && !group) {
      return null;
    }

    if (group?.privacy === 'PRIVATE') {
      const hasAccess = await this.isActiveGroupMember(group.id, query.viewerPublicId);

      if (!hasAccess) {
        return null;
      }
    }

    const places = await this.prisma.place.findMany({
      where: {
        isActive: true,
        ...(query.city ? cityOrFreeMapPointWhere(query.city) : {}),
        ...(query.state ? { state: { equals: query.state, mode: 'insensitive' } } : {}),
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
                avatarUpdatedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const mappedPlaces = places
      .map((place) => ({
        ...PrismaOndeHojeMapper.placeToDomain(place),
        voteCount: place.votes.length,
        dominantVoteType: dominantVoteType(place.votes),
        voters: place.votes.slice(0, 8).map((vote) => ({
          publicId: vote.user.publicId,
          name: vote.user.name,
          username: vote.user.username,
          avatarUrl: this.avatarUrl(vote.user),
          note: vote.note,
          voteType: vote.voteType,
        })),
      }))
      .sort((a, b) => b.voteCount - a.voteCount)
      .slice(0, query.limit ?? 3);

    return this.withFriendshipStatuses(mappedPlaces, query.viewerPublicId);
  }

  async globalTopPlaces(query: GlobalTopPlacesQuery): Promise<TodayMapPlace[]> {
    const places = await this.prisma.place.findMany({
      where: {
        isActive: true,
        ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
        ...(query.state ? { state: { equals: query.state, mode: 'insensitive' } } : {}),
        votes: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        votes: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            user: {
              select: {
                publicId: true,
                name: true,
                username: true,
                avatarUpdatedAt: true,
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
        dominantVoteType: dominantVoteType(place.votes),
        voters: place.votes.slice(0, 8).map((vote) => ({
          publicId: vote.user.publicId,
          name: vote.user.name,
          username: vote.user.username,
          avatarUrl: this.avatarUrl(vote.user),
          note: vote.note,
          voteType: vote.voteType,
        })),
      }))
      .sort((a, b) => b.voteCount - a.voteCount)
      .slice(0, query.limit ?? 50);
  }

  async history(query: PlaceHistoryQuery): Promise<PlaceHistoryDay[] | null> {
    const group = query.groupPublicId
      ? await this.prisma.group.findUnique({ where: { publicId: query.groupPublicId } })
      : null;

    if (query.groupPublicId && !group) {
      return null;
    }

    if (group?.privacy === 'PRIVATE') {
      const hasAccess = await this.isActiveGroupMember(group.id, query.viewerPublicId);

      if (!hasAccess) {
        return null;
      }
    }

    const bounds =
      query.latitude !== undefined && query.longitude !== undefined && query.radiusKm !== undefined
        ? getCoordinateBounds(query.latitude, query.longitude, query.radiusKm)
        : null;

    const votes = await this.prisma.placeVote.findMany({
      where: {
        day: {
          gte: query.from,
          lte: query.to,
        },
        status: 'ACTIVE',
        ...(group ? { groupId: group.id } : { groupId: null }),
        place: {
          isActive: true,
          ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
          ...(bounds
            ? {
                latitude: { gte: bounds.minLatitude, lte: bounds.maxLatitude },
                longitude: { gte: bounds.minLongitude, lte: bounds.maxLongitude },
              }
            : {}),
        },
      },
      include: {
        place: true,
        user: {
          select: {
            publicId: true,
            name: true,
            username: true,
            avatarUpdatedAt: true,
          },
        },
      },
      orderBy: [{ day: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    const historyByDay = new Map<string, PlaceHistoryDay>();

    for (const vote of votes) {
      const place = this.withDistance(PrismaOndeHojeMapper.placeToDomain(vote.place), query.latitude, query.longitude);

      if (query.radiusKm !== undefined && (place.distanceKm === undefined || place.distanceKm > query.radiusKm)) {
        continue;
      }

      const dayKey = toDateKey(vote.day);
      const historyDay = historyByDay.get(dayKey) ?? { day: vote.day, places: [] };
      const placeWithVotes = historyDay.places.find((item) => item.publicId === place.publicId);

      if (placeWithVotes) {
        placeWithVotes.voteCount += 1;
        placeWithVotes.dominantVoteType = dominantVoteType([
          ...placeWithVotes.voters.map((voter) => ({ voteType: voter.voteType })),
          { voteType: vote.voteType },
        ]);
        if (placeWithVotes.voters.length < 8) {
          placeWithVotes.voters.push({
            publicId: vote.user.publicId,
            name: vote.user.name,
            username: vote.user.username,
            avatarUrl: this.avatarUrl(vote.user),
            note: vote.note,
            voteType: vote.voteType,
          });
        }
      } else {
        historyDay.places.push({
          ...place,
          voteCount: 1,
          dominantVoteType: vote.voteType,
          voters: [
            {
              publicId: vote.user.publicId,
              name: vote.user.name,
              username: vote.user.username,
              avatarUrl: this.avatarUrl(vote.user),
              note: vote.note,
              voteType: vote.voteType,
            },
          ],
        });
      }

      historyByDay.set(dayKey, historyDay);
    }

    return Array.from(historyByDay.values()).map((historyDay) => ({
      ...historyDay,
      places: historyDay.places.sort((a, b) => b.voteCount - a.voteCount),
    }));
  }

  async userVoteHistory(userId: number, limit: number): Promise<UserVoteHistoryItem[]> {
    const votes = await this.prisma.placeVote.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        place: true,
        group: {
          select: {
            publicId: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ day: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return votes.map((vote) => ({
      votePublicId: vote.publicId,
      day: vote.day,
      note: vote.note,
      voteType: vote.voteType,
      scopeKey: vote.scopeKey,
      group: vote.group,
      place: PrismaOndeHojeMapper.placeToDomain(vote.place),
    }));
  }

  async attendanceEstimate(query: PlaceAttendanceEstimateQuery): Promise<PlaceAttendanceEstimate | null> {
    const [place, group] = await Promise.all([
      this.prisma.place.findUnique({ where: { publicId: query.placePublicId } }),
      query.groupPublicId ? this.prisma.group.findUnique({ where: { publicId: query.groupPublicId } }) : null,
    ]);

    if (!place || (query.groupPublicId && !group)) {
      return null;
    }

    const placeDomain = PrismaOndeHojeMapper.placeToDomain(place);
    const bounds = getCoordinateBounds(placeDomain.latitude, placeDomain.longitude, query.radiusKm);
    const day = toDateOnly(query.scheduledAt);

    const votes = await this.prisma.placeVote.findMany({
      where: {
        day,
        status: 'ACTIVE',
        ...(group ? { groupId: group.id } : { groupId: null }),
        place: {
          isActive: true,
          latitude: { gte: bounds.minLatitude, lte: bounds.maxLatitude },
          longitude: { gte: bounds.minLongitude, lte: bounds.maxLongitude },
        },
      },
      include: {
        place: true,
        user: {
          select: {
            publicId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const nearbyVotes = votes
      .map((vote) => ({
        vote,
        place: this.withDistance(
          PrismaOndeHojeMapper.placeToDomain(vote.place),
          placeDomain.latitude,
          placeDomain.longitude,
        ),
      }))
      .filter((item) => item.place.distanceKm !== undefined && item.place.distanceKm <= query.radiusKm);

    const uniqueNearbyPlaces = new Set(nearbyVotes.map((item) => item.place.publicId));

    return {
      place: placeDomain,
      scheduledAt: query.scheduledAt,
      radiusKm: query.radiusKm,
      analysisBasis: 'ACTIVE_VOTES_ON_SCHEDULED_DAY_WITHIN_RADIUS',
      attendeeCount: nearbyVotes.length,
      nearbyPlacesCount: uniqueNearbyPlaces.size,
      attendees: nearbyVotes.slice(0, 30).map(({ vote, place }) => ({
        publicId: vote.user.publicId,
        name: vote.user.name,
        note: vote.note,
        place: {
          publicId: place.publicId,
          name: place.name,
          distanceKm: place.distanceKm,
        },
      })),
    };
  }

  async countActiveVotesForDayExcludingTarget(data: {
    userId: number;
    placePublicId: string;
    day: Date;
    groupPublicId?: string;
  }): Promise<number | null> {
    const [place, group] = await Promise.all([
      this.prisma.place.findUnique({ where: { publicId: data.placePublicId } }),
      data.groupPublicId ? this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } }) : null,
    ]);

    if (!place || (data.groupPublicId && !group)) {
      return null;
    }

    if (group?.privacy === 'PRIVATE') {
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          uq_group_member: {
            groupId: group.id,
            userId: data.userId,
          },
        },
      });

      if (membership?.status !== 'ACTIVE') {
        return null;
      }
    }

    return this.prisma.placeVote.count({
      where: {
        userId: data.userId,
        status: 'ACTIVE',
        day: data.day,
        OR: [{ placeId: { not: place.id } }, { scopeKey: { not: group?.publicId ?? 'global' } }],
      },
    });
  }

  async vote(data: {
    userId: number;
    placePublicId: string;
    day: Date;
    groupPublicId?: string;
    note?: string;
    voteType?: PlaceVote['voteType'];
  }): Promise<PlaceVote | null> {
    const [place, group] = await Promise.all([
      this.prisma.place.findUnique({ where: { publicId: data.placePublicId } }),
      data.groupPublicId ? this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } }) : null,
    ]);

    if (!place || (data.groupPublicId && !group)) {
      return null;
    }

    if (group?.privacy === 'PRIVATE') {
      const membership = await this.prisma.groupMember.findUnique({
        where: {
          uq_group_member: {
            groupId: group.id,
            userId: data.userId,
          },
        },
      });

      if (membership?.status !== 'ACTIVE') {
        return null;
      }
    }

    const firstActiveVote = await this.prisma.placeVote.findFirst({
      where: {
        placeId: place.id,
        scopeKey: group?.publicId ?? 'global',
        day: data.day,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' },
    });
    const voteType = firstActiveVote?.voteType ?? data.voteType ?? 'GENERAL';

    const vote = await this.prisma.placeVote.upsert({
      where: {
        uq_vote_user_place_scope_day: {
          userId: data.userId,
          placeId: place.id,
          scopeKey: group?.publicId ?? 'global',
          day: data.day,
        },
      },
      update: {
        note: data.note,
        status: 'ACTIVE',
        voteType,
      },
      create: {
        userId: data.userId,
        placeId: place.id,
        groupId: group?.id,
        scopeKey: group?.publicId ?? 'global',
        day: data.day,
        note: data.note,
        voteType,
      },
    });

    return {
      publicId: vote.publicId,
      day: vote.day,
      status: vote.status,
      voteType: vote.voteType,
    };
  }

  async cancelVote(data: {
    userId: number;
    placePublicId: string;
    day: Date;
    groupPublicId?: string;
  }): Promise<PlaceVote | null> {
    const [place, group] = await Promise.all([
      this.prisma.place.findUnique({ where: { publicId: data.placePublicId } }),
      data.groupPublicId ? this.prisma.group.findUnique({ where: { publicId: data.groupPublicId } }) : null,
    ]);

    if (!place || (data.groupPublicId && !group)) {
      return null;
    }

    const existingVote = await this.prisma.placeVote.findUnique({
      where: {
        uq_vote_user_place_scope_day: {
          userId: data.userId,
          placeId: place.id,
          scopeKey: group?.publicId ?? 'global',
          day: data.day,
        },
      },
    });

    if (existingVote?.status !== 'ACTIVE') {
      return null;
    }

    const vote = await this.prisma.placeVote.update({
      where: { id: existingVote.id },
      data: { status: 'CANCELLED' },
    });

    return {
      publicId: vote.publicId,
      day: vote.day,
      status: vote.status,
      voteType: vote.voteType,
    };
  }

  private withDistance(place: Place, latitude?: number, longitude?: number): Place {
    if (latitude === undefined || longitude === undefined) {
      return place;
    }

    return {
      ...place,
      distanceKm: getDistanceKm(latitude, longitude, place.latitude, place.longitude),
    };
  }

  private async isActiveGroupMember(groupId: number, viewerPublicId?: string) {
    if (!viewerPublicId) {
      return false;
    }

    const membership = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        status: 'ACTIVE',
        user: { publicId: viewerPublicId },
      },
    });

    return !!membership;
  }

  private avatarUrl(user: { publicId: string; avatarUpdatedAt: Date | null }) {
    return user.avatarUpdatedAt ? `/users/${user.publicId}/avatar` : null;
  }

  private async withFriendshipStatuses(places: TodayMapPlace[], viewerPublicId?: string): Promise<TodayMapPlace[]> {
    if (!viewerPublicId || places.length === 0) {
      return places;
    }

    const viewer = await this.prisma.user.findUnique({
      where: { publicId: viewerPublicId },
      select: { id: true },
    });

    if (!viewer) {
      return places;
    }

    const voterPublicIds = Array.from(
      new Set(
        places
          .flatMap((place) => place.voters.map((voter) => voter.publicId))
          .filter((publicId) => publicId !== viewerPublicId),
      ),
    );

    if (voterPublicIds.length === 0) {
      return places;
    }

    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          {
            requesterId: viewer.id,
            addressee: { publicId: { in: voterPublicIds } },
          },
          {
            addresseeId: viewer.id,
            requester: { publicId: { in: voterPublicIds } },
          },
        ],
      },
      include: {
        requester: { select: { publicId: true } },
        addressee: { select: { publicId: true } },
      },
    });

    const friendshipByUserPublicId = new Map<
      string,
      { status: 'PENDING' | 'ACCEPTED' | 'BLOCKED'; direction: 'sent' | 'received' }
    >();

    for (const friendship of friendships) {
      const isSent = friendship.requesterId === viewer.id;
      const otherPublicId = isSent ? friendship.addressee.publicId : friendship.requester.publicId;

      friendshipByUserPublicId.set(otherPublicId, {
        status: friendship.status,
        direction: isSent ? 'sent' : 'received',
      });
    }

    return places.map((place) => ({
      ...place,
      voters: place.voters.map((voter) => ({
        ...voter,
        friendship: friendshipByUserPublicId.get(voter.publicId),
      })),
    }));
  }
}

function dominantVoteType(votes: Array<{ voteType: PlaceVote['voteType'] }>): PlaceVote['voteType'] {
  const counts = votes.reduce(
    (acc, vote) => {
      acc[vote.voteType] += 1;
      return acc;
    },
    {
      GENERAL: 0,
      MUSIC: 0,
      FOOD: 0,
      DRINK: 0,
      SPORTS: 0,
    } satisfies Record<PlaceVote['voteType'], number>,
  );

  return (Object.entries(counts) as Array<[PlaceVote['voteType'], number]>).sort(([, a], [, b]) => b - a)[0][0];
}

function cityOrFreeMapPointWhere(city: string) {
  return {
    OR: [
      { city: { equals: city, mode: 'insensitive' as const } },
      {
        city: null,
        googlePlaceId: { startsWith: 'map-click:' },
      },
    ],
  };
}
