import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetUserProfileUseCase } from '@/domain/main/application/use-cases/users/get-user-profile';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { publicIdSchema, type PublicIdSchemaType } from '@/infra/http/schemas/utils/public-id-schema';
import { UserResponseDto } from '@/infra/http/swagger/presenter-schemas/user-presenter-schema';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';
import { UserPresenter } from '../../presenters/user-presenter';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/users')
export class GetUserProfileController {
  constructor(@Inject(GetUserProfileUseCase) private getUserProfileUseCase: GetUserProfileUseCase) {}

  @Get(':publicId')
  @ApiOperation({ summary: 'Get user by public id' })
  @ApiParam({ name: 'publicId', description: 'Public user id.' })
  @ApiOkResponse({ description: 'User retrieved successfully.', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async handle(@Param(new ZodValidationPipe<PublicIdSchemaType>(publicIdSchema)) params: PublicIdSchemaType) {
    const result = await this.getUserProfileUseCase.execute({ publicId: params.publicId });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return UserPresenter.toHTTP(result.value.user);
  }
}
