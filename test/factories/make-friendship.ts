import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { Friendship, type FriendshipProps } from '@/domain/main/enterprise/entities/onde-hoje/friendships/friendship';

export function makeFriendship(override: Partial<FriendshipProps> = {}, id?: UniqueEntityID) {
  return Friendship.create(
    {
      requesterId: new UniqueEntityID(),
      addresseeId: new UniqueEntityID(),
      status: 'PENDING',
      ...override,
    },
    id,
  );
}
