import {
  FriendshipsRepository,
  type RequestFriendshipResult,
} from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
import type {
  FriendListItem,
  FriendshipStatus,
} from '@/domain/main/enterprise/entities/onde-hoje/friendships/friendship';
import type { InMemoryOndeHojeUsersRepository } from './in-memory-onde-hoje-users-repository';

export interface InMemoryFriendship {
  requesterId: number;
  addresseeId: number;
  status: FriendshipStatus;
}

export class InMemoryFriendshipsRepository extends FriendshipsRepository {
  public items: InMemoryFriendship[] = [];

  constructor(private usersRepository: InMemoryOndeHojeUsersRepository) {
    super();
  }

  private userById(id: number) {
    return this.usersRepository.items.find((user) => user.id === id) ?? null;
  }

  private findBetween(a: number, b: number) {
    return this.items.find(
      (item) =>
        (item.requesterId === a && item.addresseeId === b) ||
        (item.requesterId === b && item.addresseeId === a),
    );
  }

  async listFriends(userId: number): Promise<FriendListItem[]> {
    return this.items
      .filter((item) => item.requesterId === userId || item.addresseeId === userId)
      .flatMap((item) => {
        const sent = item.requesterId === userId;
        const friend = this.userById(sent ? item.addresseeId : item.requesterId);

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

  async requestFriendship(data: {
    requesterId: number;
    addresseeId: number;
  }): Promise<RequestFriendshipResult> {
    const existing = this.findBetween(data.requesterId, data.addresseeId);

    if (existing && (existing.status === 'ACCEPTED' || existing.status === 'BLOCKED')) {
      return { type: 'already_exists', status: existing.status };
    }

    if (existing) {
      existing.status = 'PENDING';
    } else {
      this.items.push({
        requesterId: data.requesterId,
        addresseeId: data.addresseeId,
        status: 'PENDING',
      });
    }

    return { type: 'requested', status: 'PENDING' };
  }

  async acceptFriendship(data: {
    addresseeId: number;
    requesterId: number;
  }): Promise<FriendshipStatus | null> {
    const friendship = this.items.find(
      (item) =>
        item.requesterId === data.requesterId &&
        item.addresseeId === data.addresseeId &&
        item.status === 'PENDING',
    );

    if (!friendship) {
      return null;
    }

    friendship.status = 'ACCEPTED';

    return friendship.status;
  }

  async rejectFriendship(data: { addresseeId: number; requesterId: number }): Promise<boolean> {
    const index = this.items.findIndex(
      (item) =>
        item.requesterId === data.requesterId &&
        item.addresseeId === data.addresseeId &&
        item.status === 'PENDING',
    );

    if (index < 0) {
      return false;
    }

    this.items.splice(index, 1);

    return true;
  }

  async removeFriendship(data: { userId: number; otherId: number }): Promise<boolean> {
    const friendship = this.findBetween(data.userId, data.otherId);

    if (!friendship) {
      return false;
    }

    this.items.splice(this.items.indexOf(friendship), 1);

    return true;
  }
}
