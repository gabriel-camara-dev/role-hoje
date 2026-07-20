import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { FriendshipsRepository } from '../../../repositories/onde-hoje/friendships-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import type { FriendListItem } from '../../../../enterprise/entities/onde-hoje/friendships/friendship';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface ListFriendsUseCaseRequest {
  currentUserPublicId: string;
}

type ListFriendsUseCaseResponse = Result<ResourceNotFoundError, { friends: FriendListItem[] }>;

@Injectable()
export class ListFriendsUseCase {
  constructor(
    @Inject(FriendshipsRepository) private friendshipsRepository: FriendshipsRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: ListFriendsUseCaseRequest): Promise<ListFriendsUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const friends = await this.friendshipsRepository.findManyByUserId(user.publicId);

    return success({ friends });
  }
}
