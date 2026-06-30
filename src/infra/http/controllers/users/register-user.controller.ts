import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiConflictResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterUserUseCase } from '@/domain/main/application/use-cases/users/register-user';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { registerSchema, type RegisterSchemaType } from '@/infra/http/schemas/users/register-schema';
import { CreateUserBodyDto, UserResponseDto } from '@/infra/http/swagger/presenter-schemas/user-presenter-schema';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';
import { UserPresenter } from '../../presenters/user-presenter';

@ApiTags('Users')
@Controller('/users')
export class RegisterUserController {
  constructor(@Inject(RegisterUserUseCase) private registerUserUseCase: RegisterUserUseCase) {}

  @Post()
  @HttpCode(201)
  @Public()
  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateUserBodyDto })
  @ApiCreatedResponse({ description: 'User created successfully.', type: UserResponseDto })
  @ApiConflictResponse({ description: 'User with same email, username or cpf already exists.' })
  async handle(@Body(new ZodValidationPipe<RegisterSchemaType>(registerSchema)) body: RegisterSchemaType) {
    const result = await this.registerUserUseCase.execute(body);

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return UserPresenter.toHTTP(result.value.user);
  }
}
