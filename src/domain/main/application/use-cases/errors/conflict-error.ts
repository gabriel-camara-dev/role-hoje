import { AppError } from '@/core/errors/app-error';
import { ErrorType } from '@/core/types/error-type';

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(ErrorType.CONFLICT, message);
  }
}
