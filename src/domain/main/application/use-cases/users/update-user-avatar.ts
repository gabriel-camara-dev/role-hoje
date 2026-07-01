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
    const user = await this.usersRepository.findBy({ publicId: request.currentUserPublicId });

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    const updatedUser = await this.usersRepository.updateById(user.id, {
      avatarEncryptedPath: request.encryptedPath,
      avatarIv: request.iv,
      avatarAuthTag: request.authTag,
      avatarMimeType: request.mimeType,
      avatarOriginalName: request.originalName,
      avatarUpdatedAt: new Date(),
    });

    return success({ user: updatedUser });
  }
}
