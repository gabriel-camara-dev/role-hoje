import { OndeHojeUsersRepository } from '@/domain/main/application/repositories/onde-hoje/onde-hoje-users-repository';
import type { User } from '@/domain/main/enterprise/entities/user';

export class InMemoryOndeHojeUsersRepository extends OndeHojeUsersRepository {
  public items: User[] = [];

  async findByPublicId(publicId: string): Promise<User | null> {
    return this.items.find((user) => user.publicId === publicId) ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.items.find((user) => user.username === username) ?? null;
  }
}
