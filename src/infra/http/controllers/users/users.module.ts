import { Module } from '@nestjs/common';
import { AuthenticateUserUseCase } from '@/domain/main/application/use-cases/users/authenticate-user';
import { AuthenticateUserWithGoogleUseCase } from '@/domain/main/application/use-cases/users/authenticate-user-with-google';
import { DeleteUserUseCase } from '@/domain/main/application/use-cases/users/delete-user';
import { GetUserProfileUseCase } from '@/domain/main/application/use-cases/users/get-user-profile';
import { ListUsersUseCase } from '@/domain/main/application/use-cases/users/list-users';
import { RegisterUserUseCase } from '@/domain/main/application/use-cases/users/register-user';
import { UpdateUserAvatarUseCase } from '@/domain/main/application/use-cases/users/update-user-avatar';
import { UpdateUserUseCase } from '@/domain/main/application/use-cases/users/update-user';
import { PasswordHasher } from '@/domain/main/application/use-cases/users/password-hasher';
import { DatabaseModule } from '@/infra/database/database.module';
import { EventsModule } from '@/infra/events/events.module';
import { BcryptPasswordHasher } from '@/infra/auth/bcrypt-password-hasher';
import { EncryptedAvatarStorageService } from '@/infra/storage/encrypted-avatar-storage.service';
import { GoogleOAuthConfiguredGuard } from './google-oauth.controller';
import { usersControllers } from './user.routes';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: usersControllers,
  providers: [
    AuthenticateUserUseCase,
    AuthenticateUserWithGoogleUseCase,
    RegisterUserUseCase,
    ListUsersUseCase,
    GetUserProfileUseCase,
    UpdateUserAvatarUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    GoogleOAuthConfiguredGuard,
    EncryptedAvatarStorageService,
  ],
})
export class UsersModule {}
