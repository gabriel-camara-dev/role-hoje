import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetAdminDashboardUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-dashboard';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';

@ApiTags('Onde Hoje - Admin')
@ApiBearerAuth()
@Controller('/admin/onde-hoje')
export class OndeHojeAdminController {
  constructor(@Inject(GetAdminDashboardUseCase) private getAdminDashboardUseCase: GetAdminDashboardUseCase) {}

  @Get('/dashboard')
  @ApiOperation({ summary: 'Admin dashboard metrics for Onde Hoje Map' })
  async dashboard(@CurrentUser() currentUser: UserPayload) {
    const result = await this.getAdminDashboardUseCase.execute({
      currentUserPublicId: currentUser.sub,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.dashboard;
  }
}
