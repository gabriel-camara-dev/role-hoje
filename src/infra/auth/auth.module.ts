import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EnvModule } from '../env/env.module';
import { EnvService } from '../env/env.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt-strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [EnvModule],
      inject: [EnvService],
      global: true,
      useFactory(env: EnvService) {
        const privateKey = env.get('JWT_PRIVATE_KEY');
        const publicKey = env.get('JWT_PUBLIC_KEY');
        const secret = env.get('JWT_SECRET');

        if (privateKey && publicKey) {
          return {
            signOptions: { algorithm: 'RS256' },
            privateKey: Buffer.from(privateKey, 'base64'),
            publicKey: Buffer.from(publicKey, 'base64'),
          };
        }

        return {
          secret: getRequiredJwtSecret(secret),
          signOptions: { algorithm: 'HS256' },
        };
      },
    }),
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}

function getRequiredJwtSecret(secret: string | undefined) {
  if (!secret) {
    throw new Error('JWT_SECRET must be provided when JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are not set');
  }

  return secret;
}
