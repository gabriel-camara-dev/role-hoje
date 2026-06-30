import { AppError } from '@/core/errors/app-error';
import { ErrorType } from '@/core/types/error-type';

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(ErrorType.UNAUTHORIZED, 'Invalid credentials');
  }
}
