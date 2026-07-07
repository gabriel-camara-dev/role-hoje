import type { AdminDashboard } from '../../../enterprise/entities/onde-hoje/admin/admin-dashboard';
import type {
  AdminAbuseReport,
  AdminAuthActivity,
  AdminOverview,
} from '../../../enterprise/entities/onde-hoje/admin/admin-insights';

export abstract class AdminDashboardRepository {
  abstract getDashboard(): Promise<AdminDashboard>;
  abstract getOverview(): Promise<AdminOverview>;
  abstract getAbuseReport(): Promise<AdminAbuseReport>;
  abstract getAuthActivity(): Promise<AdminAuthActivity>;
}
