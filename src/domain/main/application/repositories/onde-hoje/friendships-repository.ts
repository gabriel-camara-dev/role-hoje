import type { FriendListItem, FriendshipStatus } from '../../../enterprise/entities/onde-hoje/friendships/friendship';

export type RequestFriendshipResult =
  | { type: 'requested'; status: FriendshipStatus }
  | { type: 'already_exists'; status: Extract<FriendshipStatus, 'ACCEPTED' | 'BLOCKED'> };

/**
 * Only ever touches the `friendship` model: resolving a username into a user is
 * the use case's job (via OndeHojeUsersRepository), so every method here takes
 * ids that are already known to exist.
 */
export abstract class FriendshipsRepository {
  abstract listFriends(userId: number): Promise<FriendListItem[]>;
  abstract requestFriendship(data: { requesterId: number; addresseeId: number }): Promise<RequestFriendshipResult>;
  abstract acceptFriendship(data: { addresseeId: number; requesterId: number }): Promise<FriendshipStatus | null>;
  abstract rejectFriendship(data: { addresseeId: number; requesterId: number }): Promise<boolean>;
  abstract removeFriendship(data: { userId: number; otherId: number }): Promise<boolean>;
}
