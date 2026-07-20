import type { User } from '../../../enterprise/entities/user';

export abstract class OndeHojeUsersRepository {
  abstract findByPublicId(publicId: string): Promise<User | null>;
  abstract findByUsername(username: string): Promise<User | null>;
}
