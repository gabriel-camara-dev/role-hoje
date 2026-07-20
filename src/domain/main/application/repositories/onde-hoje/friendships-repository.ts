import type { FriendListItem, Friendship } from '../../../enterprise/entities/onde-hoje/friendships/friendship';

/**
 * Reference-shaped core (`findByUsers`/`create`/`save`/`delete`, entity in and
 * out) plus the friends listing read model. Resolving a username into a user is
 * the use case's job, so methods take publicIds already known to exist.
 */
export abstract class FriendshipsRepository {
  /** The friendship between the two users, in whichever direction it exists. */
  abstract findByUsers(data: { requesterId: string; addresseeId: string }): Promise<Friendship | null>;
  abstract create(friendship: Friendship): Promise<void>;
  abstract save(friendship: Friendship): Promise<void>;
  abstract delete(friendship: Friendship): Promise<void>;
  abstract findManyByUserId(userId: string): Promise<FriendListItem[]>;
}
