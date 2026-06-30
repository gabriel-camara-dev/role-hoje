import type {
  FriendListItem,
  FriendshipStatus,
} from '../../../enterprise/entities/onde-hoje/friendships/friendship';

export abstract class FriendshipsRepository {
  abstract listFriends(userId: number): Promise<FriendListItem[]>;
  abstract requestFriendship(data: {
    requesterId: number;
    addresseePublicId: string;
  }): Promise<FriendshipStatus | null>;
  abstract acceptFriendship(data: {
    addresseeId: number;
    requesterPublicId: string;
  }): Promise<FriendshipStatus | null>;
}
