import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, type JwtFromRequestFunction, type StrategyOptionsWithoutRequest, Strategy } from 'passport-jwt';
import { z } from 'zod';
import { EnvService } from '../env/env.service';

// Browsers cannot set Authorization headers on EventSource (SSE) requests, so
// we also accept the token via the `access_token` query param as a fallback.
const jwtFromRequest: JwtFromRequestFunction = ExtractJwt.fromExtractors([
  ExtractJwt.fromAuthHeaderAsBearerToken(),
  ExtractJwt.fromUrlQueryParameter('access_token'),
]);

const tokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(['DEFAULT', 'ADMIN']),
});

export type UserPayload = z.infer<typeof tokenPayloadSchema>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(EnvService) config: EnvService) {
    super(getJwtStrategyOptions(config));
  }

  async validate(payload: UserPayload) {
    return tokenPayloadSchema.parse(payload);
  }
}

function getJwtStrategyOptions(config: EnvService): StrategyOptionsWithoutRequest {
  const publicKey = config.get('JWT_PUBLIC_KEY');
  const secret = config.get('JWT_SECRET');

  if (publicKey) {
    return {
      jwtFromRequest,
      secretOrKey: Buffer.from(publicKey, 'base64'),
      algorithms: ['RS256'],
    };
  }

  if (!secret) {
    throw new Error('JWT_SECRET must be provided when JWT_PUBLIC_KEY is not set');
  }

  return {
    jwtFromRequest,
    secretOrKey: secret,
    algorithms: ['HS256'],
  };
}
