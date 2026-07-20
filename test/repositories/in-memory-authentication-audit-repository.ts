import {
  AuthenticationAuditRepository,
  type RecordAuthenticationAuditData,
} from '@/domain/main/application/repositories/authentication-audit-repository';

export class InMemoryAuthenticationAuditRepository extends AuthenticationAuditRepository {
  public items: RecordAuthenticationAuditData[] = [];

  async record(data: RecordAuthenticationAuditData): Promise<void> {
    this.items.push(data);
  }
}
