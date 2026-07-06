import { Controller, Get, Inject, Query, Redirect } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ConfirmUserEmailUseCase } from '@/domain/main/application/use-cases/users/confirm-user-email';
import { Public } from '@/infra/auth/public';
import { EnvService } from '@/infra/env/env.service';

@ApiTags('Users')
@Controller('/users/email')
export class ConfirmUserEmailController {
  constructor(
    @Inject(ConfirmUserEmailUseCase) private confirmUserEmailUseCase: ConfirmUserEmailUseCase,
    @Inject(EnvService) private env: EnvService,
  ) {}

  @Get('/confirm')
  @Public()
  @Redirect()
  @ApiOperation({ summary: 'Confirm user email from email link' })
  @ApiQuery({ name: 'token', type: String })
  async handle(@Query('token') token: string) {
    const frontendUrl = new URL('/login', this.env.get('FRONTEND_URL'));

    if (!token) {
      frontendUrl.searchParams.set('emailConfirmed', 'invalid');
      return { url: frontendUrl.toString() };
    }

    const result = await this.confirmUserEmailUseCase.execute({ token });

    frontendUrl.searchParams.set('emailConfirmed', result.isFail() ? 'invalid' : 'success');

    return { url: frontendUrl.toString() };
  }
}
