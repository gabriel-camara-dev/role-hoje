import { Module } from '@nestjs/common';
import { AuthenticateUserUseCase } from '@/domain/main/application/use-cases/users/authenticate-user';
import { DeleteUserUseCase } from '@/domain/main/application/use-cases/users/delete-user';
import { GetUserProfileUseCase } from '@/domain/main/application/use-cases/users/get-user-profile';
import { ListUsersUseCase } from '@/domain/main/application/use-cases/users/list-users';
import { RegisterUserUseCase } from '@/domain/main/application/use-cases/users/register-user';
import { UpdateUserUseCase } from '@/domain/main/application/use-cases/users/update-user';
import { DatabaseModule } from '@/infra/database/database.module';
import { usersControllers } from './user.routes';

@Module({
  imports: [DatabaseModule],
  controllers: usersControllers,
  providers: [
    AuthenticateUserUseCase,
    RegisterUserUseCase,
    ListUsersUseCase,
    GetUserProfileUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
  ],
})
export class UsersModule {}
