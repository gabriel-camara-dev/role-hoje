import { Module } from '@nestjs/common';
import { GetAdminDashboardUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-dashboard';
import { DatabaseModule } from '@/infra/database/database.module';
import { AdminDashboardController } from './admin-dashboard.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminDashboardController],
  providers: [GetAdminDashboardUseCase],
})
export class OndeHojeAdminModule {}
