import { AdminDashboardRepository } from '@/domain/main/application/repositories/onde-hoje/admin-dashboard-repository';
import type { AdminDashboard } from '@/domain/main/enterprise/entities/onde-hoje/admin/admin-dashboard';
import type {
  AdminAbuseReport,
  AdminAuthActivity,
  AdminOverview,
} from '@/domain/main/enterprise/entities/onde-hoje/admin/admin-insights';

/**
 * The dashboard use cases only gate on the caller's role and forward whatever
 * the repository returns, so the canned values are opaque sentinels a spec can
 * set and assert identity on.
 */
export class InMemoryAdminDashboardRepository extends AdminDashboardRepository {
  public dashboard = { sentinel: 'dashboard' } as unknown as AdminDashboard;
  public overview = { sentinel: 'overview' } as unknown as AdminOverview;
  public abuseReport = { sentinel: 'abuse' } as unknown as AdminAbuseReport;
  public authActivity = { sentinel: 'auth' } as unknown as AdminAuthActivity;

  async getDashboard(): Promise<AdminDashboard> {
    return this.dashboard;
  }

  async getOverview(): Promise<AdminOverview> {
    return this.overview;
  }

  async getAbuseReport(): Promise<AdminAbuseReport> {
    return this.abuseReport;
  }

  async getAuthActivity(): Promise<AdminAuthActivity> {
    return this.authActivity;
  }
}
