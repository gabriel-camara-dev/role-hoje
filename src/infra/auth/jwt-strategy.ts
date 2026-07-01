import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, type StrategyOptionsWithoutRequest, Strategy } from 'passport-jwt';
import { z } from 'zod';
import { EnvService } from '../env/env.service';

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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: Buffer.from(publicKey, 'base64'),
      algorithms: ['RS256'],
    };
  }

  if (!secret) {
    throw new Error('JWT_SECRET must be provided when JWT_PUBLIC_KEY is not set');
  }

  return {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: secret,
    algorithms: ['HS256'],
  };
}
