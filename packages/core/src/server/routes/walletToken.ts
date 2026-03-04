import { Router } from 'express';
import { validateToken } from '../../lib/Auth.js';

export const walletTokenRouter: Router = Router();

/**
 * POST /api/wallet/token — Public token exchange endpoint.
 * 
 * The client sends the session token (from `sigil start` output) to validate it.
 * If valid, responds with success so the client can confidently store it.
 * This endpoint must remain PUBLIC (no authMiddleware) so the client can
 * acquire the token before it has one.
 */
walletTokenRouter.post('/', (req, res) => {
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
