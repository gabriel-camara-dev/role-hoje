import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { UsersRepository } from '../../repositories/users-repository';
import type { User } from '../../../enterprise/entities/user';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';

interface UpdateUserAvatarUseCaseRequest {
  currentUserPublicId: string;
  encryptedPath: string;
  iv: string;
  authTag: string;
  mimeType: string;
  originalName: string;
}

type UpdateUserAvatarUseCaseResponse = Result<ResourceNotFoundError, { user: User }>;

@Injectable()
export class UpdateUserAvatarUseCase {
  constructor(@Inject(UsersRepository) private usersRepository: UsersRepository) {}

  async execute(request: UpdateUserAvatarUseCaseRequest): Promise<UpdateUserAvatarUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    user.updateAvatar({
      encryptedPath: request.encryptedPath,
      iv: request.iv,
      authTag: request.authTag,
      mimeType: request.mimeType,
      originalName: request.originalName,
    });
    await this.usersRepository.save(user);

    return success({ user });
  }
}
