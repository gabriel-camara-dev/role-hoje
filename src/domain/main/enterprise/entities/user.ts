import { Entity } from '@/core/entities/entity';
import type { UniqueEntityID } from '@/core/entities/unique-entity-id';
import type { Optional } from '@/core/types/optional';
import type { UserRole } from './user-role';

export { USER_ROLES, type UserRole } from './user-role';

export interface UserProps {
  name: string;
  username: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  avatarEncryptedPath: string | null;
  avatarIv: string | null;
  avatarAuthTag: string | null;
  avatarMimeType: string | null;
  avatarOriginalName: string | null;
  avatarUpdatedAt: Date | null;
  loginAttempts: number;
  lastLogin: Date | null;
  role: UserRole;
  token: string | null;
  tokenExpiresAt: Date | null;
  emailVerifiedAt: Date | null;
  emailVerificationTokenHash: string | null;
  emailVerificationTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  passwordChangedAt: Date | null;
}

export class User extends Entity<UserProps> {
  get publicId() {
    return this.id.toString();
  }

  get name() {
    return this.props.name;
  }

  get username() {
    return this.props.username;
  }

  get email() {
    return this.props.email;
  }

  get passwordHash() {
    return this.props.passwordHash;
  }

  get googleId() {
    return this.props.googleId;
  }

  get avatarEncryptedPath() {
    return this.props.avatarEncryptedPath;
  }

  get avatarIv() {
    return this.props.avatarIv;
  }

  get avatarAuthTag() {
    return this.props.avatarAuthTag;
  }

  get avatarMimeType() {
    return this.props.avatarMimeType;
  }

  get avatarOriginalName() {
    return this.props.avatarOriginalName;
  }

  get avatarUpdatedAt() {
    return this.props.avatarUpdatedAt;
  }

  get loginAttempts() {
    return this.props.loginAttempts;
  }

  get lastLogin() {
    return this.props.lastLogin;
  }

  get role() {
    return this.props.role;
  }

  get token() {
    return this.props.token;
  }

  get tokenExpiresAt() {
    return this.props.tokenExpiresAt;
  }

  get emailVerifiedAt() {
    return this.props.emailVerifiedAt;
  }

  get emailVerificationTokenHash() {
    return this.props.emailVerificationTokenHash;
  }

  get emailVerificationTokenExpiresAt() {
    return this.props.emailVerificationTokenExpiresAt;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  get passwordChangedAt() {
    return this.props.passwordChangedAt;
  }

  get isEmailVerified() {
    return this.props.emailVerifiedAt !== null;
  }

  get isAdmin() {
    return this.props.role === 'ADMIN';
  }

  recordLogin() {
    this.props.lastLogin = new Date();
    this.touch();
  }

  verifyEmail() {
    this.props.emailVerifiedAt = this.props.emailVerifiedAt ?? new Date();
    this.props.emailVerificationTokenHash = null;
    this.props.emailVerificationTokenExpiresAt = null;
    this.touch();
  }

  setEmailVerificationToken(tokenHash: string, expiresAt: Date) {
    this.props.emailVerificationTokenHash = tokenHash;
    this.props.emailVerificationTokenExpiresAt = expiresAt;
    this.touch();
  }

  linkGoogle(googleId: string) {
    this.props.googleId = googleId;
    this.touch();
  }

  updateProfile(data: { name?: string; username?: string }) {
    if (data.name !== undefined) {
      this.props.name = data.name;
    }
    if (data.username !== undefined) {
      this.props.username = data.username;
    }
    this.touch();
  }

  updateAvatar(data: { encryptedPath: string; iv: string; authTag: string; mimeType: string; originalName: string }) {
    this.props.avatarEncryptedPath = data.encryptedPath;
    this.props.avatarIv = data.iv;
    this.props.avatarAuthTag = data.authTag;
    this.props.avatarMimeType = data.mimeType;
    this.props.avatarOriginalName = data.originalName;
    this.props.avatarUpdatedAt = new Date();
    this.touch();
  }

  private touch() {
    this.props.updatedAt = new Date();
  }

  static create(
    props: Optional<
      UserProps,
      | 'passwordHash'
      | 'googleId'
      | 'avatarEncryptedPath'
      | 'avatarIv'
      | 'avatarAuthTag'
      | 'avatarMimeType'
      | 'avatarOriginalName'
      | 'avatarUpdatedAt'
      | 'loginAttempts'
      | 'lastLogin'
      | 'role'
      | 'token'
      | 'tokenExpiresAt'
      | 'emailVerifiedAt'
      | 'emailVerificationTokenHash'
      | 'emailVerificationTokenExpiresAt'
      | 'createdAt'
      | 'updatedAt'
      | 'passwordChangedAt'
    >,
    id?: UniqueEntityID,
  ) {
    const now = new Date();

    return new User(
      {
        ...props,
        passwordHash: props.passwordHash ?? null,
        googleId: props.googleId ?? null,
        avatarEncryptedPath: props.avatarEncryptedPath ?? null,
        avatarIv: props.avatarIv ?? null,
        avatarAuthTag: props.avatarAuthTag ?? null,
        avatarMimeType: props.avatarMimeType ?? null,
        avatarOriginalName: props.avatarOriginalName ?? null,
        avatarUpdatedAt: props.avatarUpdatedAt ?? null,
        loginAttempts: props.loginAttempts ?? 0,
        lastLogin: props.lastLogin ?? null,
        role: props.role ?? 'DEFAULT',
        token: props.token ?? null,
        tokenExpiresAt: props.tokenExpiresAt ?? null,
        emailVerifiedAt: props.emailVerifiedAt ?? null,
        emailVerificationTokenHash: props.emailVerificationTokenHash ?? null,
        emailVerificationTokenExpiresAt: props.emailVerificationTokenExpiresAt ?? null,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now,
        passwordChangedAt: props.passwordChangedAt ?? null,
      },
      id,
    );
  }
}
