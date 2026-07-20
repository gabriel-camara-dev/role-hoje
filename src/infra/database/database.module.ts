import { Module } from '@nestjs/common';
import { AuthenticationAuditRepository } from '@/domain/main/application/repositories/authentication-audit-repository';
import { AdminDashboardRepository } from '@/domain/main/application/repositories/onde-hoje/admin-dashboard-repository';
import { FriendshipsRepository } from '@/domain/main/application/repositories/onde-hoje/friendships-repository';
import { GroupMembersRepository } from '@/domain/main/application/repositories/onde-hoje/group-members-repository';
import { GroupsRepository } from '@/domain/main/application/repositories/onde-hoje/groups-repository';
import { NotificationsRepository } from '@/domain/main/application/repositories/onde-hoje/notifications-repository';
import { OndeHojeUsersRepository } from '@/domain/main/application/repositories/onde-hoje/onde-hoje-users-repository';
import { PlacesRepository } from '@/domain/main/application/repositories/onde-hoje/places-repository';
import { TransactionRepository } from '@/domain/main/application/repositories/transaction-repository';
import { UsersRepository } from '@/domain/main/application/repositories/users-repository';
import { DatabaseContext } from './prisma/database-context';
import { PrismaService } from './prisma/prisma.service';
import { PrismaTransactionRepository } from './prisma/repositories/prisma-transaction-repository';
import { PrismaAuthenticationAuditRepository } from './prisma/repositories/prisma-authentication-audit-repository';
import { PrismaAdminDashboardRepository } from './prisma/repositories/onde-hoje/prisma-admin-dashboard-repository';
import { PrismaFriendshipsRepository } from './prisma/repositories/onde-hoje/prisma-friendships-repository';
import { PrismaGroupMembersRepository } from './prisma/repositories/onde-hoje/prisma-group-members-repository';
import { PrismaGroupsRepository } from './prisma/repositories/onde-hoje/prisma-groups-repository';
import { PrismaNotificationsRepository } from './prisma/repositories/onde-hoje/prisma-notifications-repository';
import { PrismaOndeHojeUsersRepository } from './prisma/repositories/onde-hoje/prisma-onde-hoje-users-repository';
import { PrismaPlacesRepository } from './prisma/repositories/onde-hoje/prisma-places-repository';
import { PrismaUsersRepository } from './prisma/repositories/prisma-users-repository';

@Module({
  providers: [
    PrismaService,
    DatabaseContext,
    {
      provide: TransactionRepository,
      useClass: PrismaTransactionRepository,
    },
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
      provide: GroupMembersRepository,
      useClass: PrismaGroupMembersRepository,
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
    {
      provide: AuthenticationAuditRepository,
      useClass: PrismaAuthenticationAuditRepository,
    },
    {
      provide: NotificationsRepository,
      useClass: PrismaNotificationsRepository,
    },
  ],
  exports: [
    PrismaService,
    DatabaseContext,
    TransactionRepository,
    UsersRepository,
    PlacesRepository,
    GroupsRepository,
    GroupMembersRepository,
    FriendshipsRepository,
    AdminDashboardRepository,
    OndeHojeUsersRepository,
    AuthenticationAuditRepository,
    NotificationsRepository,
  ],
})
export class DatabaseModule {}
