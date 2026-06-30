import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthenticateUserUseCase } from '@/domain/main/application/use-cases/users/authenticate-user';
import { Public } from '@/infra/auth/public';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { authenticateSchema, type AuthenticateSchemaType } from '@/infra/http/schemas/users/authenticate-schema';
import {
  AuthenticateUserBodyDto,
  AuthenticateUserResponseDto,
} from '@/infra/http/swagger/presenter-schemas/user-presenter-schema';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';
import { UserPresenter } from '../../presenters/user-presenter';

@ApiTags('Auth')
@Controller('/sessions')
export class AuthenticateUserController {
  constructor(
    @Inject(AuthenticateUserUseCase) private authenticateUserUseCase: AuthenticateUserUseCase,
    @Inject(JwtService) private jwtService: JwtService,
  ) {}

  @Post()
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate user' })
  @ApiBody({ type: AuthenticateUserBodyDto })
  @ApiOkResponse({ description: 'User authenticated successfully.', type: AuthenticateUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async handle(@Body(new ZodValidationPipe<AuthenticateSchemaType>(authenticateSchema)) body: AuthenticateSchemaType) {
    const result = await this.authenticateUserUseCase.execute(body);

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    const { user } = result.value;
    const token = await this.jwtService.signAsync({ sub: user.publicId, role: user.role }, { expiresIn: '1d' });

    return {
      token,
      user: UserPresenter.toHTTP(user),
    };
  }
}
