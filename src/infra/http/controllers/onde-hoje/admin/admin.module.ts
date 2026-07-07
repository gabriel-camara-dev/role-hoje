import { Module } from '@nestjs/common';
import { GetAdminAbuseReportUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-abuse-report';
import { GetAdminAuthActivityUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-auth-activity';
import { GetAdminDashboardUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-dashboard';
import { GetAdminOverviewUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-overview';
import { GetUserVoteHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-user-vote-history';
import { DatabaseModule } from '@/infra/database/database.module';
import { AdminDashboardController } from './admin-dashboard.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminDashboardController],
  providers: [
    GetAdminDashboardUseCase,
    GetAdminOverviewUseCase,
    GetAdminAbuseReportUseCase,
    GetAdminAuthActivityUseCase,
    GetUserVoteHistoryUseCase,
  ],
})
export class OndeHojeAdminModule {}
