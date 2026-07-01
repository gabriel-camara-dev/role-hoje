import type { Place } from './place';

export interface PlaceHistoryDay {
  day: Date;
  places: Array<
    Place & {
      voteCount: number;
      voters: Array<{
        publicId: string;
        name: string;
        username: string;
        note: string | null;
      }>;
    }
  >;
}

export interface UserVoteHistoryItem {
  votePublicId: string;
  day: Date;
  note: string | null;
  scopeKey: string;
  group: {
    publicId: string;
    name: string;
    slug: string;
  } | null;
  place: Place;
}
