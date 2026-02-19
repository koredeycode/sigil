import { Router } from 'express';
import { rotateToken } from '../../lib/Auth.js';
import { getConfig, setConfig } from '../../lib/Database.js';

export const configRouter = Router();

// GET /api/config — read global config
configRouter.get('/', (_req, res) => {
  const keys = [
    'kill_switch',
    'per_trade_limit',
    'daily_volume_cap',
    'slippage_cap',
    'cooldown_period',
    'confirmation_threshold',
  ];

  const config: Record<string, string | undefined> = {};
  for (const key of keys) {
    config[key] = getConfig(key);
  }

  res.json(config);
});

// POST /api/config — update config values
configRouter.post('/', (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      setConfig(key, String(value));
    }
    res.json({ updated: Object.keys(updates) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// POST /api/auth/rotate — rotate session token
configRouter.post('/auth/rotate', (_req, res) => {
  const newToken = rotateToken();
  res.json({ token: newToken });
});
