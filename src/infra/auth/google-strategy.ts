import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-google-oauth20';
import { EnvService } from '../env/env.service';

export interface GoogleOAuthUser {
  googleId: string;
  email: string;
  name: string;
  pictureUrl?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(EnvService) env: EnvService) {
    super({
      clientID: getRequiredGoogleEnv(env, 'GOOGLE_CLIENT_ID'),
      clientSecret: getRequiredGoogleEnv(env, 'GOOGLE_CLIENT_SECRET'),
      callbackURL: env.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleOAuthUser {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new Error('Google account did not return an email');
    }

    return {
      googleId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
      pictureUrl: profile.photos?.[0]?.value,
    };
  }
}

function getRequiredGoogleEnv(env: EnvService, key: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET') {
  const value = env.get(key);

  if (!value) {
    throw new Error(`${key} must be provided to enable Google OAuth`);
  }

  return value;
}
