import { Module } from '@nestjs/common';
import { AdminDashboardRepository } from '@/domain/main/application/repositories/onde-hoje/admin-dashboard-repository';
import { FriendshipsRepository } from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
import { GroupsRepository } from '@/domain/main/application/repositories/onde-hoje/groups-repository';
import { OndeHojeUsersRepository } from '@/domain/main/application/repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '@/domain/main/application/repositories/onde-hoje/places-repository';
import { UsersRepository } from '@/domain/main/application/repositories/users-repository';
import { PrismaService } from './prisma/prisma.service';
import { PrismaAdminDashboardRepository } from './prisma/repositories/onde-hoje/prisma-admin-dashboard-repository';
import { PrismaFriendshipsRepository } from './prisma/repositories/onde-hoje/prisma-friendships-repository';
import { PrismaGroupsRepository } from './prisma/repositories/onde-hoje/prisma-groups-repository';
import { PrismaOndeHojeUsersRepository } from './prisma/repositories/onde-hoje/prisma-onde-hoje-users-repository';
import { PrismaPlacesRepository } from './prisma/repositories/onde-hoje/prisma-places-repository';
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
      useClass: PrismaPlacesRepository,
    },
    {
      provide: GroupsRepository,
      useClass: PrismaGroupsRepository,
    },
    {
      provide: FriendshipsRepository,
      useClass: PrismaFriendshipsRepository,
    },
    {
      provide: AdminDashboardRepository,
      useClass: PrismaAdminDashboardRepository,
    },
    {
      provide: OndeHojeUsersRepository,
      useClass: PrismaOndeHojeUsersRepository,
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
