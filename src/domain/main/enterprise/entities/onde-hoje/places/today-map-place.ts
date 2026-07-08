import type { Place } from './place';
import type { PlaceVoteType } from './place-vote';

export interface TodayMapPlace extends Place {
  voteCount: number;
  dominantVoteType: PlaceVoteType;
  voters: Array<{
    publicId: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
    note: string | null;
    voteType: PlaceVoteType;
    going: boolean;
    voteTime: string | null;
    friendship?: {
      status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
      direction: 'sent' | 'received';
    };
  }>;
}
