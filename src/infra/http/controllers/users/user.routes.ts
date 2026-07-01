import { AuthenticateUserController } from './authenticate-user.controller';
import { DeleteUserController } from './delete-user.controller';
import { GetUserProfileController } from './get-user-profile.controller';
import { GoogleOAuthController } from './google-oauth.controller';
import { ListUsersController } from './list-users.controller';
import { RegisterUserController } from './register-user.controller';
import { UpdateUserController } from './update-user.controller';

export const usersControllers = [
  AuthenticateUserController,
  GoogleOAuthController,
  RegisterUserController,
  ListUsersController,
  GetUserProfileController,
  UpdateUserController,
  DeleteUserController,
];
