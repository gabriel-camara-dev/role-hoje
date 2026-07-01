import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@/core/result';
import { fail, success } from '@/core/result';
import { AdminDashboardRepository } from '../../../repositories/onde-hoje/admin-dashboard-repository';
import { OndeHojeUsersRepository } from '../../../repositories/onde-hoje/onde-hoje-users-repository';
import type { AdminDashboard } from '../../../../enterprise/entities/onde-hoje/admin/admin-dashboard';
import { ForbiddenError } from '../../errors/forbidden-error';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';

interface GetAdminDashboardUseCaseRequest {
  currentUserPublicId: string;
}

type GetAdminDashboardUseCaseResponse = Result<ResourceNotFoundError | ForbiddenError, { dashboard: AdminDashboard }>;

@Injectable()
export class GetAdminDashboardUseCase {
  constructor(
    @Inject(AdminDashboardRepository) private adminDashboardRepository: AdminDashboardRepository,
    @Inject(OndeHojeUsersRepository) private usersRepository: OndeHojeUsersRepository,
  ) {}

  async execute(request: GetAdminDashboardUseCaseRequest): Promise<GetAdminDashboardUseCaseResponse> {
    const user = await this.usersRepository.findByPublicId(request.currentUserPublicId);

    if (!user) {
      return fail(new ResourceNotFoundError('Authenticated user not found'));
    }

    if (user.role !== 'ADMIN') {
      return fail(new ForbiddenError('Admin access required'));
    }

    const dashboard = await this.adminDashboardRepository.getDashboard();

    return success({ dashboard });
  }
}
