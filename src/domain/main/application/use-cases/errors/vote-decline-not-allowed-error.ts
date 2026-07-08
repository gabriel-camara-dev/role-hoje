import { AppError } from '@/core/errors/app-error';
import { ErrorType } from '@/core/types/error-type';

export class VoteDeclineNotAllowedError extends AppError {
  constructor() {
    super(ErrorType.CONFLICT, 'You can only mark "not going" on a place that already has votes');
  }
}
