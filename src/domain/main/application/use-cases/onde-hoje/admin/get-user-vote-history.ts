import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import type { UserVoteHistoryItem } from '../../../../enterprise/entities/onde-hoje/places/place-history';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '../../../repositories/onde-hoje/places-repository';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface GetUserVoteHistoryUseCaseRequest {
  currentUserPublicId: string;
  targetUserPublicId: string;
  limit?: number;
}

export interface AdminUserSummary {
  publicId: string;
  name: string;
  username: string;
  email: string;
  role: string;
  lastLogin: string | null;
  createdAt: string;
  emailVerified: boolean;
}

type GetUserVoteHistoryUseCaseResponse = Result<
  ResourceNotFoundError | ForbiddenError,
  { user: AdminUserSummary; votes: UserVoteHistoryItem[] }
>;

@Injectable()
export class GetUserVoteHistoryUseCase {
  constructor(
    @Inject(PlacesRepository) private placesRepository: PlacesRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: GetUserVoteHistoryUseCaseRequest): Promise<GetUserVoteHistoryUseCaseResponse> {
    const currentUser = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!currentUser) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    if (currentUser.role !== 'ADMIN') {
      return fail(new ForbiddenError('Admin access required'));
    }

    const targetUser = await this.usersRepository.findByPublicId(request.targetUserPublicId);

    if (!targetUser) {
      return fail(new ResourceNotFoundError('User not found'));
    }

    const votes = await this.placesRepository.userVoteHistory(targetUser.id, request.limit ?? 100);

    return success({
      user: {
        publicId: targetUser.publicId,
        name: targetUser.name,
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        lastLogin: targetUser.lastLogin ? targetUser.lastLogin.toISOString() : null,
        createdAt: targetUser.createdAt.toISOString(),
        emailVerified: Boolean(targetUser.emailVerifiedAt),
      },
      votes,
    });
  }
}
