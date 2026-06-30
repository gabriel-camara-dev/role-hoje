import { AppError } from '@/core/errors/app-error';
import { ErrorType } from '@/core/types/error-type';

export class ResourceNotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(ErrorType.NOT_FOUND, message);
  }
}
