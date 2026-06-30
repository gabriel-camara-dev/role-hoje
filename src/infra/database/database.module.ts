import { Module } from '@nestjs/common';
import { AdminDashboardRepository } from '@/domain/main/application/repositories/onde-hoje/admin-dashboard-repository';
import { FriendshipsRepository } from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
import { GroupsRepository } from '@/domain/main/application/repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '@/domain/main/application/repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '@/domain/main/application/repositories/onde-hoje/places-repository';
import { UsersRepository } from '@/domain/main/application/repositories/users-repository';
import { PrismaService } from './prisma/prisma.service';
import { PrismaOndeHojeRepository } from './prisma/repositories/prisma-onde-hoje-repository';
import { PrismaUsersRepository } from './prisma/repositories/prisma-users-repository';

@Module({
  providers: [
    PrismaService,
    {
      provide: UsersRepository,
      useClass: PrismaUsersRepository,
    },
    {
      provide: PlacesRepository,
      useClass: PrismaOndeHojeRepository,
    },
    {
      provide: GroupsRepository,
      useClass: PrismaOndeHojeRepository,
    },
    {
      provide: FriendshipsRepository,
      useClass: PrismaOndeHojeRepository,
    },
    {
      provide: AdminDashboardRepository,
      useClass: PrismaOndeHojeRepository,
    },
    {
      provide: OndeHojeUsersRepository,
      useClass: PrismaOndeHojeRepository,
    },
  ],
  exports: [
    PrismaService,
    UsersRepository,
    PlacesRepository,
    GroupsRepository,
    FriendshipsRepository,
    AdminDashboardRepository,
    OndeHojeUsersRepository,
  ],
})
export class DatabaseModule {}
