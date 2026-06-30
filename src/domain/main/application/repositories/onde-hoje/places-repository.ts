import type { CreatePlaceData, Place } from '../../../enterprise/entities/onde-hoje/places/place';
import type { PlaceVote } from '../../../enterprise/entities/onde-hoje/places/place-vote';
import type { TodayMapPlace } from '../../../enterprise/entities/onde-hoje/places/today-map-place';

export interface ListPlacesQuery {
  q?: string;
  city?: string;
}

export interface TodayMapQuery {
  city?: string;
  groupPublicId?: string;
}

export abstract class PlacesRepository {
  abstract list(query: ListPlacesQuery): Promise<Place[]>;
  abstract upsert(data: CreatePlaceData): Promise<Place>;
  abstract todayMap(query: TodayMapQuery): Promise<TodayMapPlace[]>;
  abstract voteToday(data: {
    userId: number;
    placePublicId: string;
    groupPublicId?: string;
    note?: string;
  }): Promise<PlaceVote | null>;
}

