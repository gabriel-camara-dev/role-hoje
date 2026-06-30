import type { AdminDashboard } from '../../../enterprise/entities/onde-hoje/admin/admin-dashboard';

export abstract class AdminDashboardRepository {
  abstract getDashboard(): Promise<AdminDashboard>;
}

