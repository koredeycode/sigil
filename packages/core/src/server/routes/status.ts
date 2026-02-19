import { Router } from 'express';
import { getAllAgents } from '../../lib/Database.js';

export const statusRouter: Router = Router();

statusRouter.get('/', (_req, res) => {
  const agents = getAllAgents();
  const running = agents.filter((a) => a.status === 'running').length;

  res.json({
    status: 'ok',
    version: '0.1.0',
    agents: {
      total: agents.length,
      running,
    },
    uptime: process.uptime(),
  });
});
