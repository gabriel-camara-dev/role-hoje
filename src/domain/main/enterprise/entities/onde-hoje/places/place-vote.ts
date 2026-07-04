export type PlaceVoteType = 'GENERAL' | 'MUSIC' | 'FOOD' | 'DRINK' | 'SPORTS';

export interface PlaceVote {
  publicId: string;
  day: Date;
  status: string;
  voteType: PlaceVoteType;
}
