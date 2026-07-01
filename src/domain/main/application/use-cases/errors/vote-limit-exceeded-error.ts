import { AppError } from '@/core/errors/app-error';
import { ErrorType } from '@/core/types/error-type';

export class VoteLimitExceededError extends AppError {
  constructor(limit: number) {
    super(ErrorType.CONFLICT, `You can vote for at most ${limit} places per day`);
  }
}
