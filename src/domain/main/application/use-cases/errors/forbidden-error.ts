import { AppError } from '@/core/errors/app-error';
import { ErrorType } from '@/core/types/error-type';

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(ErrorType.FORBIDDEN, message);
  }
}
