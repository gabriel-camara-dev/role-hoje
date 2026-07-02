import { Body, Controller, Inject, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateUserUseCase } from '@/domain/main/application/use-cases/users/update-user';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { publicIdSchema, type PublicIdSchemaType } from '@/infra/http/schemas/utils/public-id-schema';
import { updateSchema, type UpdateSchemaType } from '@/infra/http/schemas/users/update-schema';
import { UpdateUserBodyDto, UserResponseDto } from '@/infra/http/swagger/presenter-schemas/user-presenter-schema';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';
import { UserPresenter } from '../../presenters/user-presenter';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/users')
export class UpdateUserController {
  constructor(@Inject(UpdateUserUseCase) private updateUserUseCase: UpdateUserUseCase) {}

  @Patch(':publicId')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'publicId', description: 'Public user id.' })
  @ApiBody({ type: UpdateUserBodyDto })
  @ApiOkResponse({ description: 'User updated successfully.', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiConflictResponse({ description: 'User with same email already exists.' })
  async handle(
    @CurrentUser() currentUser: UserPayload,
    @Param(new ZodValidationPipe<PublicIdSchemaType>(publicIdSchema)) params: PublicIdSchemaType,
    @Body(new ZodValidationPipe<UpdateSchemaType>(updateSchema)) body: UpdateSchemaType,
  ) {
    const result = await this.updateUserUseCase.execute({
      currentUserPublicId: currentUser.sub,
      currentUserRole: currentUser.role,
      publicId: params.publicId,
      ...body,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return UserPresenter.toHTTP(result.value.user);
  }
}
