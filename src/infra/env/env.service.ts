import { Injectable } from '@nestjs/common';
import { env } from './env';

@Injectable()
export class EnvService {
  get<Key extends keyof typeof env>(key: Key): (typeof env)[Key] {
    return env[key];
  }
}
