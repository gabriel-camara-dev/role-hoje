import { Inject, Injectable } from '@nestjs/common';
import type { User } from '@/domain/main/enterprise/entities/user';
import type { OndeHojeUsersRepository } from '@/domain/main/application/repositories/onde-hoje/onde-hoje-users-repository';
import { PrismaUserMapper } from '../../mappers/prisma-user-mapper';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PrismaOndeHojeUsersRepository implements OndeHojeUsersRepository {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async findByPublicId(publicId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { publicId } });

    return user ? PrismaUserMapper.toDomain(user) : null;
  }
}
