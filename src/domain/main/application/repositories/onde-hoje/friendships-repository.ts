import type { FriendListItem, FriendshipStatus } from '../../../enterprise/entities/onde-hoje/friendships/friendship';

export type RequestFriendshipResult =
  | { type: 'requested'; status: FriendshipStatus }
  | { type: 'already_exists'; status: Extract<FriendshipStatus, 'ACCEPTED' | 'BLOCKED'> }
  | { type: 'not_found' };

export abstract class FriendshipsRepository {
  abstract listFriends(userId: number): Promise<FriendListItem[]>;
  abstract requestFriendship(data: {
    requesterId: number;
    addresseePublicId: string;
  }): Promise<RequestFriendshipResult>;
  abstract acceptFriendship(data: { addresseeId: number; requesterPublicId: string }): Promise<FriendshipStatus | null>;
}
