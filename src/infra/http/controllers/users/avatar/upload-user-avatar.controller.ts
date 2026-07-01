import { Controller, Inject, Patch, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { GetUserProfileUseCase } from '@/domain/main/application/use-cases/users/get-user-profile';
import { UpdateUserAvatarUseCase } from '@/domain/main/application/use-cases/users/update-user-avatar';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { UserPresenter } from '@/infra/http/presenters/user-presenter';
import { UserResponseDto } from '@/infra/http/swagger/presenter-schemas/user-presenter-schema';
import { EncryptedAvatarStorageService } from '@/infra/storage/encrypted-avatar-storage.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/users')
export class UploadUserAvatarController {
  constructor(
    @Inject(UpdateUserAvatarUseCase) private updateUserAvatarUseCase: UpdateUserAvatarUseCase,
    @Inject(GetUserProfileUseCase) private getUserProfileUseCase: GetUserProfileUseCase,
    @Inject(EncryptedAvatarStorageService) private encryptedAvatarStorage: EncryptedAvatarStorageService,
  ) {}

  @Patch('/me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Change profile avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'Avatar uploaded successfully.', type: UserResponseDto })
  async handle(@CurrentUser() currentUser: UserPayload, @UploadedFile() file: Express.Multer.File) {
    const previousProfile = await this.getUserProfileUseCase.execute({ publicId: currentUser.sub });
    const previousAvatarPath = previousProfile.isSuccess() ? previousProfile.value.user.avatarEncryptedPath : null;
    const storedAvatar = await this.encryptedAvatarStorage.store(file);
    const result = await this.updateUserAvatarUseCase.execute({
      currentUserPublicId: currentUser.sub,
      encryptedPath: storedAvatar.encryptedPath,
      iv: storedAvatar.iv,
      authTag: storedAvatar.authTag,
      mimeType: storedAvatar.mimeType,
      originalName: storedAvatar.originalName,
    });

    if (result.isFail()) {
      await this.encryptedAvatarStorage.delete(storedAvatar.encryptedPath);
      throwHttpError(result.value);
    }

    if (previousAvatarPath) {
      await this.encryptedAvatarStorage.delete(previousAvatarPath);
    }

    return UserPresenter.toHTTP(result.value.user);
  }
}
