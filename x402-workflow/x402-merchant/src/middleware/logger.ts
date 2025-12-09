/**
 * Request Logger Middleware
 */

import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  console.log(`[${new Date().toISOString()}] ${req.method.padEnd(6)} ${req.path}`);
  next();
}
