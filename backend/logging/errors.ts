import { APIError } from "encore.dev/api";
import { logger } from "./logger";

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  RATE_LIMITED = "RATE_LIMITED",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS",
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public data?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, { field });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, 404, { resource, id });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(ErrorCode.AUTHORIZATION_ERROR, message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message, 409);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number = 1, available: number = 0) {
    super(
      ErrorCode.INSUFFICIENT_CREDITS,
      `Insufficient credits. Required: ${required}, Available: ${available}`,
      402,
      { required, available }
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `External service error: ${service}`,
      502,
      { service, originalError: originalError?.message }
    );
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, originalError?: Error) {
    super(
      ErrorCode.DATABASE_ERROR,
      `Database error during ${operation}`,
      500,
      { operation, originalError: originalError?.message }
    );
  }
}

export function handleError(error: unknown, context?: {
  service?: string;
  endpoint?: string;
  userId?: string;
}): never {
  logger.error("Error occurred", {
    error: error instanceof Error ? error : new Error(String(error)),
    ...context,
  });

  if (error instanceof AppError) {
    throw APIError.internal(error.message);
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes("not found")) {
      throw APIError.notFound(error.message);
    }
    
    if (error.message.includes("unauthorized") || error.message.includes("invalid token")) {
      throw APIError.unauthenticated(error.message);
    }

    if (error.message.includes("credits")) {
      throw APIError.internal(error.message);
    }

    // Database constraint errors
    if (error.message.includes("unique constraint") || error.message.includes("duplicate key")) {
      throw APIError.alreadyExists("Resource already exists");
    }

    // Foreign key constraint errors
    if (error.message.includes("foreign key constraint")) {
      throw APIError.invalidArgument("Invalid reference to related resource");
    }
  }

  // Default to internal server error
  throw APIError.internal("An unexpected error occurred");
}

export function wrapAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: { service?: string; endpoint?: string }
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
    }
  };
}