import { DomainEvents } from '@/core/events/domain-events';
import { FriendshipsRepository } from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
import type { FriendListItem, Friendship } from '@/domain/main/enterprise/entities/onde-hoje/friendships/friendship';
import type { InMemoryOndeHojeUsersRepository } from './in-memory-onde-hoje-users-repository';

export class InMemoryFriendshipsRepository extends FriendshipsRepository {
  public items: Friendship[] = [];

  constructor(private usersRepository: InMemoryOndeHojeUsersRepository) {
    super();
  }

  private userByPublicId(publicId: string) {
    return this.usersRepository.items.find((user) => user.publicId === publicId) ?? null;
  }

  private indexOf(friendship: Friendship) {
    return this.items.findIndex((item) => item.pairKey === friendship.pairKey);
  }

  async findByUsers(data: { requesterId: string; addresseeId: string }): Promise<Friendship | null> {
    const pairKey = [data.requesterId, data.addresseeId].sort().join(':');

    return this.items.find((item) => item.pairKey === pairKey) ?? null;
  }

  async create(friendship: Friendship): Promise<void> {
    this.items.push(friendship);

    DomainEvents.dispatchEventsForAggregate(friendship.id);
  }

  async save(friendship: Friendship): Promise<void> {
    const index = this.indexOf(friendship);

    if (index >= 0) {
      this.items[index] = friendship;
    }

    DomainEvents.dispatchEventsForAggregate(friendship.id);
  }

  async delete(friendship: Friendship): Promise<void> {
    const index = this.indexOf(friendship);

    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  async findManyByUserId(userId: string): Promise<FriendListItem[]> {
    return this.items
      .filter((item) => item.requesterId.toString() === userId || item.addresseeId.toString() === userId)
      .flatMap((item) => {
        const sent = item.requesterId.toString() === userId;
        const friend = this.userByPublicId(sent ? item.addresseeId.toString() : item.requesterId.toString());

        if (!friend) {
          return [];
        }

        return [
          {
            status: item.status,
            direction: sent ? ('sent' as const) : ('received' as const),
            friend: {
              publicId: friend.publicId,
              name: friend.name,
              username: friend.username,
              avatarUrl: null,
            },
          },
        ];
      });
  }
}
