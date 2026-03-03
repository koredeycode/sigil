import { Router } from 'express';
import { validateToken } from '../../lib/Auth.js';

export const extensionTokenRouter: Router = Router();

/**
 * POST /api/extension/token — Public token exchange endpoint.
 * 
 * The extension sends the session token (from `sigil start` output) to validate it.
 * If valid, responds with success so the extension can confidently store it.
 * This endpoint must remain PUBLIC (no authMiddleware) so the extension can
 * acquire the token before it has one.
 */
extensionTokenRouter.post('/', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Token is required', data: null });
      return;
    }

    if (!validateToken(token)) {
      res.status(401).json({ message: 'Invalid session token', data: null });
      return;
    }

    res.json({ message: 'Token validated successfully', data: { valid: true } });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});
