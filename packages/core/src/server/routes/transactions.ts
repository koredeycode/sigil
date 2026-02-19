import { Router } from 'express';
import { getAgentTransactions } from '../../lib/Database.js';

export const transactionsRouter = Router();

// GET /api/transactions?agentId=...&limit=50 — list transactions for an agent
transactionsRouter.get('/', (req, res) => {
  const { agentId, limit } = req.query;
  if (!agentId) {
    res.status(400).json({ error: 'agentId query param required' });
    return;
  }
  const txs = getAgentTransactions(String(agentId), Number(limit) || 50);
  res.json(txs);
});
