import type { CreatePlaceData, Place } from '../../../enterprise/entities/onde-hoje/places/place';
import type { PlaceAttendanceEstimate } from '../../../enterprise/entities/onde-hoje/places/place-attendance-estimate';
import type { PlaceHistoryDay, UserVoteHistoryItem } from '../../../enterprise/entities/onde-hoje/places/place-history';
import type { PlaceVote } from '../../../enterprise/entities/onde-hoje/places/place-vote';
import type { TodayMapPlace } from '../../../enterprise/entities/onde-hoje/places/today-map-place';

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
  viewerPublicId?: string;
}

export interface TopPlacesTodayQuery {
  city?: string;
  groupPublicId?: string;
  day?: Date;
  viewerPublicId?: string;
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
  abstract history(query: PlaceHistoryQuery): Promise<PlaceHistoryDay[] | null>;
  abstract userVoteHistory(userId: number, limit: number): Promise<UserVoteHistoryItem[]>;
  abstract attendanceEstimate(query: PlaceAttendanceEstimateQuery): Promise<PlaceAttendanceEstimate | null>;
  abstract countActiveVotesForDayExcludingTarget(data: {
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
  }): Promise<PlaceVote | null>;
}
