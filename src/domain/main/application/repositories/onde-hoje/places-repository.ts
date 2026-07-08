import type { CreatePlaceData, Place } from '../../../enterprise/entities/onde-hoje/places/place';
import type { PlaceAttendanceEstimate } from '../../../enterprise/entities/onde-hoje/places/place-attendance-estimate';
import type { PlaceHistoryDay, UserVoteHistoryItem } from '../../../enterprise/entities/onde-hoje/places/place-history';
import type { PlaceVote, PlaceVoteType } from '../../../enterprise/entities/onde-hoje/places/place-vote';
import type { TodayMapPlace } from '../../../enterprise/entities/onde-hoje/places/today-map-place';

export interface VoteActorInfo {
  publicId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface VoteNotificationTargets {
  placePublicId: string;
  placeName: string;
  actor: VoteActorInfo;
  recipients: Array<{ id: number; publicId: string }>;
}

export interface ListPlacesQuery {
  q?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface TodayMapQuery {
  city?: string;
  groupPublicId?: string;
  day?: Date;
  from?: Date;
  to?: Date;
  viewerPublicId?: string;
  // When true (and no specific group is set), aggregates public votes with the
  // votes of every group the authenticated viewer actively belongs to.
  includeViewerGroups?: boolean;
}

export interface TopPlacesTodayQuery {
  city?: string;
  state?: string;
  groupPublicId?: string;
  day?: Date;
  from?: Date;
  to?: Date;
  viewerPublicId?: string;
  limit?: number;
  includeViewerGroups?: boolean;
}

export interface GlobalTopPlacesQuery {
  city?: string;
  state?: string;
  limit?: number;
}

export interface PlaceHistoryQuery {
  from: Date;
  to: Date;
  city?: string;
  groupPublicId?: string;
  viewerPublicId?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface PlaceAttendanceEstimateQuery {
  placePublicId: string;
  scheduledAt: Date;
  radiusKm: number;
  groupPublicId?: string;
}

export abstract class PlacesRepository {
  abstract list(query: ListPlacesQuery): Promise<Place[]>;
  abstract upsert(data: CreatePlaceData): Promise<Place>;
  abstract todayMap(query: TodayMapQuery): Promise<TodayMapPlace[] | null>;
  abstract topPlacesToday(query: TopPlacesTodayQuery): Promise<TodayMapPlace[] | null>;
  abstract globalTopPlaces(query: GlobalTopPlacesQuery): Promise<TodayMapPlace[]>;
  abstract history(query: PlaceHistoryQuery): Promise<PlaceHistoryDay[] | null>;
  abstract userVoteHistory(userId: number, limit: number): Promise<UserVoteHistoryItem[]>;
  abstract attendanceEstimate(query: PlaceAttendanceEstimateQuery): Promise<PlaceAttendanceEstimate | null>;
  abstract countActiveVotesForWeekExcludingTarget(data: {
    userId: number;
    placePublicId: string;
    day: Date;
    groupPublicId?: string;
  }): Promise<number | null>;
  abstract vote(data: {
    userId: number;
    placePublicId: string;
    day: Date;
    groupPublicId?: string;
    note?: string;
    voteType?: PlaceVoteType;
    showIdentity?: boolean;
    going?: boolean;
    voteTime?: string;
  }): Promise<PlaceVote | null>;
  abstract findVoteNotificationTargets(data: {
    actorUserId: number;
    placePublicId: string;
    day: Date;
    groupPublicId?: string;
  }): Promise<VoteNotificationTargets | null>;
  abstract mapPlaceByPublicId(data: {
    placePublicId: string;
    day?: Date;
    groupPublicId?: string;
    viewerPublicId?: string;
  }): Promise<TodayMapPlace | null>;
  abstract cancelVote(data: {
    userId: number;
    placePublicId: string;
    day: Date;
    groupPublicId?: string;
  }): Promise<PlaceVote | null>;
}
