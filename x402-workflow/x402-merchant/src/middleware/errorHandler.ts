/**
 * @fileoverview Error Handler Middleware
 * @description Centralized error handling for the application
 */

import type { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    statusCode: HTTP_STATUS.NOT_FOUND,
  });
}

/**
 * Global error handler
 * Catches all errors and returns appropriate response
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err.message);
  
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
    return;
  }
  
  // Unknown error - don't leak details in production
  const statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;
  
  res.status(statusCode).json({
    error: message,
    statusCode,
  });
}
