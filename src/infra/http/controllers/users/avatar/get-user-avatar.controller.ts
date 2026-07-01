import { Controller, Get, Header, Inject, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ResourceNotFoundError } from '@/domain/main/application/use-cases/errors/resource-not-found-error';
import { GetUserProfileUseCase } from '@/domain/main/application/use-cases/users/get-user-profile';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { publicIdSchema, type PublicIdSchemaType } from '@/infra/http/schemas/utils/public-id-schema';
import { EncryptedAvatarStorageService } from '@/infra/storage/encrypted-avatar-storage.service';
import { ZodValidationPipe } from '../../../pipes/zod-validation-pipe';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/users')
export class GetUserAvatarController {
  constructor(
    @Inject(GetUserProfileUseCase) private getUserProfileUseCase: GetUserProfileUseCase,
    @Inject(EncryptedAvatarStorageService) private encryptedAvatarStorage: EncryptedAvatarStorageService,
  ) {}

  @Get('/:publicId/avatar')
  @Public()
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Get decrypted profile avatar' })
  @ApiParam({ name: 'publicId', description: 'Public user id.' })
  @ApiOkResponse({ description: 'Avatar image stream.' })
  @ApiNotFoundResponse({ description: 'User or avatar not found.' })
  async handle(
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
