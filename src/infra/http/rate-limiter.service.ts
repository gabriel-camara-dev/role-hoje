import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface RateLimitAttempt {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  maxAttempts: number;
  windowInMs: number;
  message?: string;
}

@Injectable()
export class RateLimiterService {
  private attempts = new Map<string, RateLimitAttempt>();

  assertAllowed(key: string, { maxAttempts, windowInMs, message }: RateLimitOptions) {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || attempt.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + windowInMs });
      return;
    }

    if (attempt.count >= maxAttempts) {
      throw new HttpException(message ?? 'Too many attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    attempt.count += 1;
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  getKeyFromRequestIp(request: {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    socket: { remoteAddress?: string };
  }) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];

    return rawIp?.trim() || request.ip || request.socket.remoteAddress || 'unknown';
  }
}
