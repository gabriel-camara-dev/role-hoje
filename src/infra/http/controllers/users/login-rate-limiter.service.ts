import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimiterService } from '@/infra/http/rate-limiter.service';

const maxAttempts = 5;
const windowInMs = 60_000;

@Injectable()
export class LoginRateLimiterService {
  constructor(@Inject(RateLimiterService) private rateLimiter: RateLimiterService) {}

  getKey(request: Request, login: string) {
    const ip = this.rateLimiter.getKeyFromRequestIp(request);

    return `${ip}:${login.toLowerCase()}`;
  }

  assertAllowed(key: string) {
    this.rateLimiter.assertAllowed(key, {
      maxAttempts,
      windowInMs,
      message: 'Too many login attempts. Try again later.',
    });
  }

  reset(key: string) {
    this.rateLimiter.reset(key);
  }
}
