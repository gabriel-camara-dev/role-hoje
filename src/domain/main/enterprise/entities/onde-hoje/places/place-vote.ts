export type PlaceVoteType = 'GENERAL' | 'MUSIC' | 'FOOD' | 'DRINK';

export interface PlaceVote {
  publicId: string;
  day: Date;
  status: string;
  voteType: PlaceVoteType;
}
