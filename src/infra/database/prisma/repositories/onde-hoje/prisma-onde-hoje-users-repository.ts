import { Inject, Injectable } from '@nestjs/common';
import type { User } from '@/domain/main/enterprise/entities/user';
import { OndeHojeUsersRepository } from '@/domain/main/application/repositories/onde-hoje/onde-hoje-users-repository';
import { DatabaseContext } from '../../database-context';
import { PrismaUserMapper } from '../../mappers/prisma-user-mapper';

@Injectable()
export class PrismaOndeHojeUsersRepository extends OndeHojeUsersRepository {
  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {
    super();
  }

  async findByPublicId(publicId: string): Promise<User | null> {
    const user = await this.dbContext.client.user.findUnique({ where: { publicId } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.dbContext.client.user.findUnique({ where: { username } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }
}
