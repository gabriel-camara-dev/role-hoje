import type { Request } from 'express';
import type { AuthenticationContext } from '@/domain/main/application/use-cases/users/authenticate-user';

export function buildAuthenticationContext(request: Request): AuthenticationContext {
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
  const origin = request.headers.origin;

  return {
    ipAddress: forwardedIp || request.ip || request.socket?.remoteAddress || null,
    remotePort: request.socket?.remotePort ? String(request.socket.remotePort) : null,
    userAgent: request.headers['user-agent'] ?? null,
    origin: typeof origin === 'string' ? origin : null,
  };
}
