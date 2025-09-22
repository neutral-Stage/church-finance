// Comprehensive error handling architecture for consistent error management
// This provides unified error handling across API routes, components, and services

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly details?: any;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.details = details;

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Specific error types for different domains
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401, true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404, true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, true, details);
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'BUSINESS_LOGIC_ERROR', 422, true, details);
  }
}

// Error response types for API consistency
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    timestamp: string;
    details?: any;
    stack?: string; // Only in development
  };
  success: false;
}

export interface SuccessResponse<T = any> {
  data: T;
  success: true;
  message?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Error handler for API routes
export function handleApiError(error: unknown): ErrorResponse {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        timestamp: error.timestamp,
        details: error.details,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      success: false
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        message: error.message || 'Internal server error',
        code: 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      success: false
    };
  }

  return {
    error: {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    },
    success: false
  };
}

// Supabase error mapping
export function mapSupabaseError(error: any): AppError {
  if (!error) return new AppError('Unknown database error');

  const message = error.message || error.details || 'Database operation failed';

  // Map common Supabase/PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      return new ValidationError('Duplicate entry detected', { field: error.constraint });

    case '23503': // foreign_key_violation
      return new ValidationError('Referenced record does not exist', { constraint: error.constraint });

    case '23502': // not_null_violation
      return new ValidationError('Required field is missing', { field: error.column });

    case '42P01': // undefined_table
      return new DatabaseError('Table does not exist', { table: error.table });

    case '42703': // undefined_column
      return new DatabaseError('Column does not exist', { column: error.column });

    case 'PGRST116': // No rows found
      return new NotFoundError();

    case 'PGRST301': // Row level security violation
      return new AuthorizationError('Access denied by security policy');

    default:
      return new DatabaseError(message, { originalError: error });
  }
}

// Validation helper functions
export class ValidationHelper {
  private errors: Record<string, string> = {};

  required(value: any, fieldName: string): this {
    if (value === null || value === undefined || value === '') {
      this.errors[fieldName] = `${fieldName} is required`;
    }
    return this;
  }

  email(value: string, fieldName: string): this {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      this.errors[fieldName] = `${fieldName} must be a valid email address`;
    }
    return this;
  }

  minLength(value: string, min: number, fieldName: string): this {
    if (value && value.length < min) {
      this.errors[fieldName] = `${fieldName} must be at least ${min} characters`;
    }
    return this;
  }

  maxLength(value: string, max: number, fieldName: string): this {
    if (value && value.length > max) {
      this.errors[fieldName] = `${fieldName} must be at most ${max} characters`;
    }
    return this;
  }

  positive(value: number, fieldName: string): this {
    if (value !== undefined && value <= 0) {
      this.errors[fieldName] = `${fieldName} must be positive`;
    }
    return this;
  }

  date(value: string, fieldName: string): this {
    if (value && isNaN(Date.parse(value))) {
      this.errors[fieldName] = `${fieldName} must be a valid date`;
    }
    return this;
  }

  custom(condition: boolean, fieldName: string, message: string): this {
    if (!condition) {
      this.errors[fieldName] = message;
    }
    return this;
  }

  validate(): void {
    if (Object.keys(this.errors).length > 0) {
      throw new ValidationError('Validation failed', this.errors);
    }
  }

  getErrors(): Record<string, string> {
    return { ...this.errors };
  }

  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  clear(): this {
    this.errors = {};
    return this;
  }
}

// Factory function for validation
export function validate(): ValidationHelper {
  return new ValidationHelper();
}

// Async error wrapper for API routes
export function asyncHandler(
  fn: (req: any, res?: any) => Promise<any>
) {
  return async (req: any, res?: any) => {
    try {
      return await fn(req, res);
    } catch (error) {
      if (res) {
        // Express/Next.js response object
        const errorResponse = handleApiError(error);
        const statusCode = error instanceof AppError ? error.statusCode : 500;
        return res.status(statusCode).json(errorResponse);
      }

      // Re-throw if no response object (for other contexts)
      throw error;
    }
  };
}

// Success response helper
export function success<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    data,
    success: true,
    message
  };
}

// Client-side error boundary types
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorLogger {
  static log(error: Error, context?: string, additionalInfo?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      additionalInfo,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    console.error('Application Error:', logEntry);

    // In production, you would send this to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to logging service
      // logService.send(logEntry);
    }
  }

  static warn(message: string, context?: string, additionalInfo?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      level: 'warning',
      context,
      additionalInfo
    };

    console.warn('Application Warning:', logEntry);
  }

  static info(message: string, context?: string, additionalInfo?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      level: 'info',
      context,
      additionalInfo
    };

    console.info('Application Info:', logEntry);
  }
}

// Hook for client-side error handling
export function useErrorHandler() {
  const handleError = (error: unknown, context?: string) => {
    if (error instanceof Error) {
      ErrorLogger.log(error, context);
    } else {
      ErrorLogger.log(new Error(String(error)), context);
    }
  };

  const handleAsyncError = async <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context);
      return null;
    }
  };

  return {
    handleError,
    handleAsyncError,
    logger: ErrorLogger
  };
}

// Common error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  VALIDATION_FAILED: 'Please check your input and try again',
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection',
  SERVER_ERROR: 'An unexpected server error occurred. Please try again later',
  TIMEOUT: 'The request timed out. Please try again',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this transaction',
  DUPLICATE_ENTRY: 'This entry already exists',
  INVALID_DATE: 'Please enter a valid date',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_AMOUNT: 'Please enter a valid amount',
  REQUIRED_FIELD: 'This field is required'
} as const;

// Type-safe error message keys
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

export function getErrorMessage(key: ErrorMessageKey): string {
  return ERROR_MESSAGES[key];
}