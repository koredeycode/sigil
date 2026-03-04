import { Router } from 'express';
import { getAllAgents, getDatabase } from '../../lib/Database.js';

export const statusRouter: Router = Router();

statusRouter.get('/', (_req, res) => {
  let dbStatus = 'disconnected';
  let providersCount = 0;
  let primaryProvider = 'none';

  try {
    const db = getDatabase();
    dbStatus = 'connected';
    // Using a direct count query to avoid exporting getAllProviders if it's not exported, though we can assume the db is healthy here.
    const providers = db.prepare('SELECT name, is_primary FROM providers').all() as Array<{ name: string; is_primary: number }>;
    providersCount = providers.length;
    primaryProvider = providers.find((p) => p.is_primary === 1)?.name || 'none';
  } catch (error) {
    dbStatus = 'error';
  }

  let agents: any[] = [];
  try {
    agents = getAllAgents();
  } catch (e) {
    // ignore
  }
  const running = agents.filter((a) => a.status === 'running').length;

  res.json({
    message: 'Status retrieved successfully',
    data: {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      version: '0.1.0',
      database: dbStatus,
      llmProviders: {
        total: providersCount,
        primary: primaryProvider,
      },
      agents: {
        total: agents.length,
        running,
      },
      uptime: process.uptime(),
    }
  });
});
