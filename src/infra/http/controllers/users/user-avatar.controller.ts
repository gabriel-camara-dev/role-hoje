import {
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { GetUserProfileUseCase } from '@/domain/main/application/use-cases/users/get-user-profile';
import { ResourceNotFoundError } from '@/domain/main/application/use-cases/errors/resource-not-found-error';
import { UpdateUserAvatarUseCase } from '@/domain/main/application/use-cases/users/update-user-avatar';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { UserResponseDto } from '@/infra/http/swagger/presenter-schemas/user-presenter-schema';
import { EncryptedAvatarStorageService } from '@/infra/storage/encrypted-avatar-storage.service';
import { publicIdSchema, type PublicIdSchemaType } from '../../schemas/utils/public-id-schema';
import { UserPresenter } from '../../presenters/user-presenter';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/users')
export class UserAvatarController {
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
  async upload(@CurrentUser() currentUser: UserPayload, @UploadedFile() file: Express.Multer.File) {
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

  @Get('/:publicId/avatar')
  @Public()
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Get decrypted profile avatar' })
  @ApiParam({ name: 'publicId', description: 'Public user id.' })
  @ApiOkResponse({ description: 'Avatar image stream.' })
  @ApiNotFoundResponse({ description: 'User or avatar not found.' })
  async getAvatar(
    @Param(new ZodValidationPipe<PublicIdSchemaType>(publicIdSchema)) params: PublicIdSchemaType,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.getUserProfileUseCase.execute({ publicId: params.publicId });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    const user = result.value.user;

    if (!user.avatarEncryptedPath || !user.avatarIv || !user.avatarAuthTag || !user.avatarMimeType) {
      throwHttpError(new ResourceNotFoundError('Avatar not found'));
    }

    const avatar = await this.encryptedAvatarStorage.read({
      encryptedPath: user.avatarEncryptedPath,
      iv: user.avatarIv,
      authTag: user.avatarAuthTag,
      mimeType: user.avatarMimeType,
      originalName: user.avatarOriginalName ?? 'avatar',
    });

    response.contentType(avatar.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${avatar.originalName.replaceAll('"', '')}"`);

    return new StreamableFile(avatar.buffer);
  }
}
