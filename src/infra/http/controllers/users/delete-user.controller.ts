import { Controller, Delete, HttpCode, Inject, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DeleteUserUseCase } from '@/domain/main/application/use-cases/users/delete-user';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { publicIdSchema, type PublicIdSchemaType } from '@/infra/http/schemas/utils/public-id-schema';
import { EncryptedAvatarStorageService } from '@/infra/storage/encrypted-avatar-storage.service';
import { GetUserProfileUseCase } from '@/domain/main/application/use-cases/users/get-user-profile';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/users')
export class DeleteUserController {
  constructor(
    @Inject(DeleteUserUseCase) private deleteUserUseCase: DeleteUserUseCase,
    @Inject(GetUserProfileUseCase) private getUserProfileUseCase: GetUserProfileUseCase,
    @Inject(EncryptedAvatarStorageService) private encryptedAvatarStorage: EncryptedAvatarStorageService,
  ) {}

  @Delete(':publicId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'publicId', description: 'Public user id.' })
  @ApiNoContentResponse({ description: 'User deleted successfully.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Param(new ZodValidationPipe<PublicIdSchemaType>(publicIdSchema)) params: PublicIdSchemaType,
  ) {
    const profile = await this.getUserProfileUseCase.execute({ publicId: params.publicId });
    const avatarPath = profile.isSuccess() ? profile.value.user.avatarEncryptedPath : null;
    const result = await this.deleteUserUseCase.execute({
      currentUserPublicId: currentUser.sub,
      currentUserRole: currentUser.role,
      publicId: params.publicId,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    if (avatarPath) {
      await this.encryptedAvatarStorage.delete(avatarPath);
    }
  }
}
