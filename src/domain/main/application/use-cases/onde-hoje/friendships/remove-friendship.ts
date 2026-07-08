import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { FriendshipsRepository } from '../../../repositories/onde-hoje/friendships-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface RemoveFriendshipUseCaseRequest {
  currentUserPublicId: string;
  friendUsername: string;
}

type RemoveFriendshipUseCaseResponse = Result<ResourceNotFoundError, { removed: true }>;

@Injectable()
export class RemoveFriendshipUseCase {
  constructor(
    @Inject(FriendshipsRepository) private friendshipsRepository: FriendshipsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: RemoveFriendshipUseCaseRequest): Promise<RemoveFriendshipUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const removed = await this.friendshipsRepository.removeFriendship({
      userId: user.id,
      otherUsername: request.friendUsername,
    });

    if (!removed) {
      return fail(new ResourceNotFoundError('Friendship not found'));
    }

    return success({ removed: true });
  }
}
