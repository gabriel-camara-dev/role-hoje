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

    const rejected = await this.friendshipsRepository.rejectFriendship({
      addresseeId: user.id,
      requesterUsername: request.requesterUsername,
    });

    if (!rejected) {
      return fail(new ResourceNotFoundError('Friend request not found'));
    }

    return success({ rejected: true });
  }
}
