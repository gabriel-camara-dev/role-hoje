export type AuthenticationAuditStatus =
  | 'SUCCESS'
  | 'USER_NOT_EXISTS'
  | 'INCORRECT_PASSWORD'
  | 'RECOVER_PASSWORD'
  | 'INVALID_TOKEN'
  | 'BLOCKED';

export interface RecordAuthenticationAuditData {
  status: AuthenticationAuditStatus;
  /** Null when the login attempt could not be tied to an account. */
  userPublicId?: string | null;
  ipAddress?: string | null;
  remotePort?: string | null;
  userAgent?: string | null;
  origin?: string | null;
}

export abstract class AuthenticationAuditRepository {
  abstract record(data: RecordAuthenticationAuditData): Promise<void>;
}
