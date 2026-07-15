import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AuthenticationAuditRepository,
  RecordAuthenticationAuditData,
} from '@/domain/main/application/repositories/authentication-audit-repository';
import { DatabaseContext } from '../database-context';

@Injectable()
export class PrismaAuthenticationAuditRepository implements AuthenticationAuditRepository {
  private readonly logger = new Logger(PrismaAuthenticationAuditRepository.name);

  constructor(@Inject(DatabaseContext) private readonly dbContext: DatabaseContext) {}

  async record(data: RecordAuthenticationAuditData): Promise<void> {
    try {
      await this.dbContext.client.authenticationAudit.create({
        data: {
          status: data.status,
          userId: data.userId ?? null,
          ipAddress: data.ipAddress ?? null,
          remotePort: data.remotePort ?? null,
          userAgent: data.userAgent ?? null,
          origin: data.origin ?? null,
        },
      });
    } catch (error) {
      // Auditing must never break the authentication flow.
      this.logger.warn(`Failed to record authentication audit: ${String(error)}`);
    }
  }
}
