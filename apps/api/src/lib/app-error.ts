import { ErrorCode } from '@portfoliohub/shared';

const DEFAULT_STATUS_BY_CODE: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

/**
 * Thrown by middleware/handlers to signal a response that should be rendered
 * via the standard ApiEnvelope by the terminal error handler.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;

  constructor(code: ErrorCode, message: string, httpStatus = DEFAULT_STATUS_BY_CODE[code]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
  }

  static badRequest(message: string): AppError {
    return new AppError(ErrorCode.BAD_REQUEST, message);
  }

  static unauthorized(message: string): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message: string): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message);
  }

  static notFound(message: string): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message);
  }

  static conflict(message: string): AppError {
    return new AppError(ErrorCode.CONFLICT, message);
  }

  static validation(message: string): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message);
  }

  static internal(message: string): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message);
  }
}
