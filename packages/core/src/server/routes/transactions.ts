import { Router } from 'express';
import { getAgentTransactions } from '../../lib/Database.js';

export const transactionsRouter: Router = Router();

// GET /api/transactions?agentId=...&limit=50 — list transactions for an agent
transactionsRouter.get('/', (req, res) => {
  const { agentId, limit } = req.query;
  if (!agentId) {
    res.status(400).json({ message: 'agentId query param required', data: null });
    return;
  }
  const txs = getAgentTransactions(String(agentId), Number(limit) || 50);
  res.json({ message: 'Transactions retrieved successfully', data: txs });
});
