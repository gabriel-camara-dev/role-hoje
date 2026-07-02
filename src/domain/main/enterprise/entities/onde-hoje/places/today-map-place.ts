import type { Place } from './place';

export interface TodayMapPlace extends Place {
  voteCount: number;
  voters: Array<{
    publicId: string;
    name: string;
    avatarUrl: string | null;
    note: string | null;
  }>;
}
