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
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { publicIdSchema, type PublicIdSchemaType } from '@/infra/http/schemas/utils/public-id-schema';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/users')
export class DeleteUserController {
  constructor(@Inject(DeleteUserUseCase) private deleteUserUseCase: DeleteUserUseCase) {}

  @Delete(':publicId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'publicId', description: 'Public user id.' })
  @ApiNoContentResponse({ description: 'User deleted successfully.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async handle(@Param(new ZodValidationPipe<PublicIdSchemaType>(publicIdSchema)) params: PublicIdSchemaType) {
    const result = await this.deleteUserUseCase.execute({ publicId: params.publicId });

    if (result.isFail()) {
      throwHttpError(result.value);
    }
  }
}
