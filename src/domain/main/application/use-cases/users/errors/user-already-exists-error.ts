import { AppError } from '@/core/errors/app-error';
import { ErrorType } from '@/core/types/error-type';

export class UserAlreadyExistsError extends AppError {
  constructor(message = 'User with same email already exists') {
    super(ErrorType.CONFLICT, message);
  }
}
