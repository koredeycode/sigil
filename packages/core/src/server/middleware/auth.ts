import { NextFunction, Request, Response } from 'express';
import { validateToken } from '../../lib/Auth.js';

/**
 * Express middleware — validates the Authorization: Bearer <token> header.
 * Rejects with 401 if the token is missing or invalid.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!validateToken(token)) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid session token' });
    return;
  }

  next();
}
