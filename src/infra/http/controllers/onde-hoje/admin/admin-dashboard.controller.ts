import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetAdminAbuseReportUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-abuse-report';
import { GetAdminAuthActivityUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-auth-activity';
import { GetAdminDashboardUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-dashboard';
import { GetAdminOverviewUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-admin-overview';
import { GetUserVoteHistoryUseCase } from '@/domain/main/application/use-cases/onde-hoje/admin/get-user-vote-history';
import { CurrentUser } from '@/infra/auth/current-user-generator';
import type { UserPayload } from '@/infra/auth/jwt-strategy';
import { throwHttpError } from '@/infra/http/errors/http-error-handler';
import { PlacePresenter } from '@/infra/http/presenters/onde-hoje/place-presenter';
import {
  AdminAbuseReportResponseDto,
  AdminAuthActivityResponseDto,
  AdminDashboardResponseDto,
  AdminOverviewResponseDto,
  AdminUserHistoryResponseDto,
} from '@/infra/http/swagger/presenter-schemas/onde-hoje/admin-presenter-schema';

@ApiTags('Onde Hoje - Admin')
@ApiBearerAuth()
@Controller('/admin/onde-hoje')
export class AdminDashboardController {
  constructor(
    @Inject(GetAdminDashboardUseCase) private getAdminDashboardUseCase: GetAdminDashboardUseCase,
    @Inject(GetAdminOverviewUseCase) private getAdminOverviewUseCase: GetAdminOverviewUseCase,
    @Inject(GetAdminAbuseReportUseCase) private getAdminAbuseReportUseCase: GetAdminAbuseReportUseCase,
    @Inject(GetAdminAuthActivityUseCase) private getAdminAuthActivityUseCase: GetAdminAuthActivityUseCase,
    @Inject(GetUserVoteHistoryUseCase) private getUserVoteHistoryUseCase: GetUserVoteHistoryUseCase,
  ) {}

  @Get('/dashboard')
  @ApiOperation({ summary: 'Admin dashboard metrics for Onde Hoje Map' })
  @ApiOkResponse({ description: 'Admin dashboard retrieved successfully.', type: AdminDashboardResponseDto })
  async handle(@CurrentUser() currentUser: UserPayload) {
    const result = await this.getAdminDashboardUseCase.execute({
      currentUserPublicId: currentUser.sub,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.dashboard;
  }

  @Get('/overview')
  @ApiOperation({ summary: 'System-wide overview metrics (users, votes, activity, trends)' })
  @ApiOkResponse({ description: 'Admin overview retrieved successfully.', type: AdminOverviewResponseDto })
  async overview(@CurrentUser() currentUser: UserPayload) {
    const result = await this.getAdminOverviewUseCase.execute({
      currentUserPublicId: currentUser.sub,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.overview;
  }

  @Get('/abuse')
  @ApiOperation({ summary: 'Abuse and moderation monitoring (heavy voters, cancellations, reports)' })
  @ApiOkResponse({ description: 'Admin abuse report retrieved successfully.', type: AdminAbuseReportResponseDto })
  async abuse(@CurrentUser() currentUser: UserPayload) {
    const result = await this.getAdminAbuseReportUseCase.execute({
      currentUserPublicId: currentUser.sub,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.abuseReport;
  }

  @Get('/auth-activity')
  @ApiOperation({ summary: 'Authentication activity (logins, failures, suspicious IPs)' })
  @ApiOkResponse({ description: 'Admin auth activity retrieved successfully.', type: AdminAuthActivityResponseDto })
  async authActivity(@CurrentUser() currentUser: UserPayload) {
    const result = await this.getAdminAuthActivityUseCase.execute({
      currentUserPublicId: currentUser.sub,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return result.value.authActivity;
  }

  @Get('/users/:publicId/history')
  @ApiOperation({ summary: "Get a specific user's profile summary and vote history" })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiOkResponse({ description: 'User vote history retrieved successfully.', type: AdminUserHistoryResponseDto })
  async userHistory(
    @CurrentUser() currentUser: UserPayload,
    @Param('publicId') publicId: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.getUserVoteHistoryUseCase.execute({
      currentUserPublicId: currentUser.sub,
      targetUserPublicId: publicId,
      limit: limit ? Number(limit) : undefined,
    });

    if (result.isFail()) {
      throwHttpError(result.value);
    }

    return {
      user: result.value.user,
      votes: result.value.votes.map((vote) => PlacePresenter.userVoteHistoryToHTTP(vote)),
    };
  }
}
