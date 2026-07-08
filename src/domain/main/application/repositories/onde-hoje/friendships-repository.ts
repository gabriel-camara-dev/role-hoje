import type { FriendListItem, FriendshipStatus } from '../../../enterprise/entities/onde-hoje/friendships/friendship';

export type RequestFriendshipResult =
  | { type: 'requested'; status: FriendshipStatus; addresseePublicId: string }
  | { type: 'already_exists'; status: Extract<FriendshipStatus, 'ACCEPTED' | 'BLOCKED'> }
  | { type: 'not_found' };

export interface AcceptFriendshipResult {
  status: FriendshipStatus;
  requesterPublicId: string;
}

export abstract class FriendshipsRepository {
  abstract listFriends(userId: number): Promise<FriendListItem[]>;
  abstract requestFriendship(data: {
    requesterId: number;
    addresseeUsername: string;
  }): Promise<RequestFriendshipResult>;
  abstract acceptFriendship(data: {
    addresseeId: number;
    requesterUsername: string;
  }): Promise<AcceptFriendshipResult | null>;
  abstract rejectFriendship(data: { addresseeId: number; requesterUsername: string }): Promise<boolean>;
}
