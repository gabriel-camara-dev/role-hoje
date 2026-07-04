import { AppError } from '@/core/errors/app-error';
import { ErrorType } from '@/core/types/error-type';

export type UserAlreadyExistsField = 'email' | 'username';

export class UserAlreadyExistsError extends AppError {
  constructor(
    public readonly field: UserAlreadyExistsField,
    message = `User with same ${field} already exists`,
  ) {
    super(ErrorType.CONFLICT, message);
  }
}
