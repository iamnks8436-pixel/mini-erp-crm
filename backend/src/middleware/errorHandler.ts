import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const errorDetails = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed: ' + errorDetails.map(e => `${e.field}: ${e.message}`).join(', '),
      errors: errorDetails,
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle PostgreSQL unique violation (code 23505)
  if (err.code === '23505') {
    let message = 'A record with this unique value already exists.';
    if (err.detail) {
      message = err.detail;
    }
    res.status(409).json({
      success: false,
      message,
    });
    return;
  }

  // Handle PostgreSQL foreign key violation (code 23503)
  if (err.code === '23503') {
    res.status(400).json({
      success: false,
      message: 'Referenced entity does not exist or cannot be modified due to dependencies.',
    });
    return;
  }

  // Handle PostgreSQL check violation (code 23514)
  if (err.code === '23514') {
    res.status(400).json({
      success: false,
      message: 'Database check constraint violated. Values cannot be negative.',
    });
    return;
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error. Please try again later.',
  });
}
