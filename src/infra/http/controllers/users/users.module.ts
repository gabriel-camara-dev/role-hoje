import { Module } from '@nestjs/common';
import { AuthenticateUserUseCase } from '@/domain/main/application/use-cases/users/authenticate-user';
import { AuthenticateUserWithGoogleUseCase } from '@/domain/main/application/use-cases/users/authenticate-user-with-google';
import { DeleteUserUseCase } from '@/domain/main/application/use-cases/users/delete-user';
import { GetUserProfileUseCase } from '@/domain/main/application/use-cases/users/get-user-profile';
import { ListUsersUseCase } from '@/domain/main/application/use-cases/users/list-users';
import { RegisterUserUseCase } from '@/domain/main/application/use-cases/users/register-user';
import { ConfirmUserEmailUseCase } from '@/domain/main/application/use-cases/users/confirm-user-email';
import { DeleteExpiredUnverifiedUsersUseCase } from '@/domain/main/application/use-cases/users/delete-expired-unverified-users';
import { ResendUserEmailConfirmationUseCase } from '@/domain/main/application/use-cases/users/resend-user-email-confirmation';
import { UpdateUserAvatarUseCase } from '@/domain/main/application/use-cases/users/update-user-avatar';
import { UpdateUserUseCase } from '@/domain/main/application/use-cases/users/update-user';
import { PasswordHasher } from '@/domain/main/application/use-cases/users/password-hasher';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { MailModule } from '@/infra/mail/mail.module';
import { BcryptPasswordHasher } from '@/infra/auth/bcrypt-password-hasher';
import { EncryptedAvatarStorageService } from '@/infra/storage/encrypted-avatar-storage.service';
import { RateLimiterService } from '@/infra/http/rate-limiter.service';
import { ExpiredUnverifiedUsersCleanupService } from '@/infra/tasks/expired-unverified-users-cleanup.service';
import { UserAvatarModule } from './avatar/avatar.module';
import { GoogleOAuthConfiguredGuard } from './google-oauth.controller';
import { LoginRateLimiterService } from './login-rate-limiter.service';
import { usersControllers } from './user.routes';

@Module({
  imports: [DatabaseModule, EventsModule, MailModule, UserAvatarModule],
  controllers: usersControllers,
  providers: [
    AuthenticateUserUseCase,
    AuthenticateUserWithGoogleUseCase,
    RegisterUserUseCase,
    ConfirmUserEmailUseCase,
    DeleteExpiredUnverifiedUsersUseCase,
    ResendUserEmailConfirmationUseCase,
    ListUsersUseCase,
    GetUserProfileUseCase,
    UpdateUserAvatarUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    GoogleOAuthConfiguredGuard,
    EncryptedAvatarStorageService,
    LoginRateLimiterService,
    RateLimiterService,
    ExpiredUnverifiedUsersCleanupService,
  ],
})
export class UsersModule {}
