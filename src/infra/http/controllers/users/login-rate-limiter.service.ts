import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const maxAttempts = 5;
const windowInMs = 60_000;

interface LoginAttempt {
  count: number;
  resetAt: number;
}

@Injectable()
export class LoginRateLimiterService {
  private attempts = new Map<string, LoginAttempt>();

  getKey(request: Request, login: string) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
    const ip = rawIp?.trim() || request.ip || request.socket.remoteAddress || 'unknown';

    return `${ip}:${login.toLowerCase()}`;
  }

  assertAllowed(key: string) {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || attempt.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + windowInMs });
      return;
    }

    if (attempt.count >= maxAttempts) {
      throw new HttpException('Too many login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    attempt.count += 1;
  }

  reset(key: string) {
    this.attempts.delete(key);
  }
}
