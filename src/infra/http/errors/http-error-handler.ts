import { HttpException } from '@nestjs/common';
import type { AppError } from '@/core/errors/app-error';
import { toHttpStatus } from '@/core/types/error-type';

export function throwHttpError(error: AppError): never {
  throw new HttpException(
    {
      message: error.message,
      error: error.name,
      statusCode: toHttpStatus(error.type),
      ...('field' in error ? { field: error.field } : {}),
    },
    toHttpStatus(error.type),
  );
}
