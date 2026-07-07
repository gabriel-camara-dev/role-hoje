import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { AdminDashboardRepository } from '../../../repositories/onde-hoje/admin-dashboard-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import type { AdminOverview } from '../../../../enterprise/entities/onde-hoje/admin/admin-insights';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface GetAdminOverviewUseCaseRequest {
  currentUserPublicId: string;
}

type GetAdminOverviewUseCaseResponse = Result<ResourceNotFoundError | ForbiddenError, { overview: AdminOverview }>;

@Injectable()
export class GetAdminOverviewUseCase {
  constructor(
    @Inject(AdminDashboardRepository) private adminDashboardRepository: AdminDashboardRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: GetAdminOverviewUseCaseRequest): Promise<GetAdminOverviewUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    if (user.role !== 'ADMIN') {
      return fail(new ForbiddenError('Admin access required'));
    }

    const overview = await this.adminDashboardRepository.getOverview();

    return success({ overview });
  }
}
