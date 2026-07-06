import { Body, Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { ResendUserEmailConfirmationUseCase } from '@/domain/main/application/use-cases/users/resend-user-email-confirmation';
import { Public } from '@/infra/auth/public';
import { RateLimiterService } from '@/infra/http/rate-limiter.service';
import { emailSchema } from '@/infra/http/schemas/utils/email';
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe';

const resendEmailConfirmationSchema = z.object({
  email: emailSchema,
});

type ResendEmailConfirmationSchema = z.infer<typeof resendEmailConfirmationSchema>;

const maxAttempts = 3;
const windowInMs = 10 * 60_000;

@ApiTags('Users')
@Controller('/users/email')
export class ResendUserEmailConfirmationController {
  constructor(
    @Inject(ResendUserEmailConfirmationUseCase)
    private resendUserEmailConfirmationUseCase: ResendUserEmailConfirmationUseCase,
    @Inject(RateLimiterService) private rateLimiter: RateLimiterService,
  ) {}

  @Post('/confirmation')
  @HttpCode(204)
  @Public()
  @ApiOperation({ summary: 'Resend confirmation email by email address' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'gabriel@example.com' },
      },
      required: ['email'],
    },
  })
  async handle(
    @Req() request: Request,
    @Body(new ZodValidationPipe<ResendEmailConfirmationSchema>(resendEmailConfirmationSchema))
    body: ResendEmailConfirmationSchema,
  ) {
    const ip = this.rateLimiter.getKeyFromRequestIp(request);

    this.rateLimiter.assertAllowed(`email-confirmation:${ip}:${body.email.toLowerCase()}`, {
      maxAttempts,
      windowInMs,
      message: 'Too many confirmation email requests. Try again later.',
    });

    await this.resendUserEmailConfirmationUseCase.execute({
      email: body.email,
    });
  }
}
