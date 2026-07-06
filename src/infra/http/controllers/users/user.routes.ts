import { AuthenticateUserController } from './authenticate-user.controller';
import { ConfirmUserEmailController } from './confirm-user-email.controller';
import { DeleteUserController } from './delete-user.controller';
import { GetUserProfileController } from './get-user-profile.controller';
import { GoogleOAuthController } from './google-oauth.controller';
import { ListUsersController } from './list-users.controller';
import { RegisterUserController } from './register-user.controller';
import { ResendUserEmailConfirmationController } from './resend-user-email-confirmation.controller';
import { UpdateUserController } from './update-user.controller';

export const usersControllers = [
  AuthenticateUserController,
  GoogleOAuthController,
  RegisterUserController,
  ConfirmUserEmailController,
  ResendUserEmailConfirmationController,
  ListUsersController,
  GetUserProfileController,
  UpdateUserController,
  DeleteUserController,
];
