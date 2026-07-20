import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { FriendshipsRepository } from '../../../repositories/onde-hoje/friendships-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface RejectFriendshipUseCaseRequest {
  currentUserPublicId: string;
  requesterUsername: string;
}

type RejectFriendshipUseCaseResponse = Result<ResourceNotFoundError, { rejected: true }>;

@Injectable()
export class RejectFriendshipUseCase {
  constructor(
    @Inject(FriendshipsRepository) private friendshipsRepository: FriendshipsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: RejectFriendshipUseCaseRequest): Promise<RejectFriendshipUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const requester = await this.usersRepository.findByUsername(request.requesterUsername);

    if (!requester) {
      return fail(new ResourceNotFoundError('Friend request not found'));
    }

    const friendship = await this.friendshipsRepository.findByUsers({
      requesterId: requester.publicId,
      addresseeId: user.publicId,
    });

    // Only the addressee of a still-pending request may reject it.
    if (!friendship?.isPending || friendship.addresseeId.toString() !== user.publicId) {
      return fail(new ResourceNotFoundError('Friend request not found'));
    }

    await this.friendshipsRepository.delete(friendship);

    return success({ rejected: true });
  }
}
