import { AppError } from '@/core/errors/app-error';
import { ErrorType } from '@/core/types/error-type';

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super(ErrorType.FORBIDDEN, 'Email not verified');
  }
}
