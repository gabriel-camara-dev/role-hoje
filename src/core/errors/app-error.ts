import type { ErrorType } from '../types/error-type';

export abstract class AppError extends Error {
  constructor(
    public readonly type: ErrorType,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
