export enum ErrorType {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

const statusMap: Record<ErrorType, number> = {
  [ErrorType.BAD_REQUEST]: 400,
  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.FORBIDDEN]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.UNPROCESSABLE_ENTITY]: 422,
  [ErrorType.INTERNAL_SERVER_ERROR]: 500,
};

export function toHttpStatus(type: ErrorType) {
  return statusMap[type] ?? 500;
}
