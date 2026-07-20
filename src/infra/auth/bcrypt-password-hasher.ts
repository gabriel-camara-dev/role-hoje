import { Inject, Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import type { PasswordHasher } from '@/domain/main/application/use-cases/users/password-hasher';
import { EnvService } from '../env/env.service';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(@Inject(EnvService) private env: EnvService) {}

  hash(plain: string): Promise<string> {
    return hash(plain, this.env.get('HASH_SALT_ROUNDS'));
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
