import { Body, Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticationAuditRepository } from '@/domain/main/application/repositories/authentication-audit-repository';
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
import { buildAuthenticationContext } from './auth-audit-context';
import { LoginRateLimiterService } from './login-rate-limiter.service';

@ApiTags('Auth')
@Controller('/sessions')
export class AuthenticateUserController {
  constructor(
    @Inject(AuthenticateUserUseCase) private authenticateUserUseCase: AuthenticateUserUseCase,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(LoginRateLimiterService) private loginRateLimiter: LoginRateLimiterService,
    @Inject(AuthenticationAuditRepository)
    private authenticationAuditRepository: AuthenticationAuditRepository,
  ) {}

  @Post()
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate user' })
  @ApiBody({ type: AuthenticateUserBodyDto })
  @ApiOkResponse({ description: 'User authenticated successfully.', type: AuthenticateUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async handle(
    @Req() request: Request,
    @Body(new ZodValidationPipe<AuthenticateSchemaType>(authenticateSchema)) body: AuthenticateSchemaType,
  ) {
    const context = buildAuthenticationContext(request);
    const rateLimitKey = this.loginRateLimiter.getKey(request, body.login);

    try {
      this.loginRateLimiter.assertAllowed(rateLimitKey);
    } catch (error) {
      await this.authenticationAuditRepository.record({ status: 'BLOCKED', ...context });
      throw error;
    }

    const result = await this.authenticateUserUseCase.execute({ ...body, context });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    this.loginRateLimiter.reset(rateLimitKey);

    const { user } = result.value;
    const token = await this.jwtService.signAsync({ sub: user.publicId, role: user.role }, { expiresIn: '1d' });

    return {
      token,
      user: UserPresenter.toHTTP(user),
    };
  }
}
