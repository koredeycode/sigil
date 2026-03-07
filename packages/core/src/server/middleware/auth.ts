import { NextFunction, Request, Response } from 'express';
import { validateToken } from '../../lib/Auth.js';
import { logger } from '../../lib/Logger.js';

/**
 * Express middleware — validates the Authorization: Bearer <token> header.
 * Rejects with 401 if the token is missing or invalid.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`[Auth] 401 Unauthorized: Missing or invalid Authorization header for ${req.method} ${req.originalUrl}`);
    res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!validateToken(token)) {
    logger.warn(`[Auth] 401 Unauthorized: Invalid session token for ${req.method} ${req.originalUrl}`);
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid session token' });
    return;
  }

  next();
}
