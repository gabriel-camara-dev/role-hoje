import { PasswordHasher } from '@/domain/main/application/use-cases/users/password-hasher';

/** Hashing is `plain + '-hashed'`, so a spec can assert on the stored value. */
export class FakePasswordHasher extends PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `${plain}-hashed`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return `${plain}-hashed` === hash;
  }
}
