import type { Place } from './place';
import type { PlaceVoteType } from './place-vote';
import type { TodayMapPlace } from './today-map-place';

export interface PlaceHistoryDay {
  day: Date;
  places: TodayMapPlace[];
}

export interface UserVoteHistoryItem {
  votePublicId: string;
  day: Date;
  note: string | null;
  voteType: PlaceVoteType;
  scopeKey: string;
  group: {
    publicId: string;
    name: string;
    slug: string;
  } | null;
  place: Place;
}
