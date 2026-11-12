export interface ApiErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: ApiErrorDetail[];

  constructor(statusCode: number, message: string, isOperational = true, details?: ApiErrorDetail[]) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
