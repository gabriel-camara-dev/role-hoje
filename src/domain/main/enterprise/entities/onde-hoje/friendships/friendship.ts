export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

export interface FriendListItem {
  status: FriendshipStatus;
  direction: 'sent' | 'received';
  friend: {
    publicId: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
  };
}
