import { Router } from 'express';
import {
    addDirective,
    deleteDirective,
    getAllDirectivesForAgent,
    toggleDirective,
} from '../../lib/Database.js';

export const directivesRouter: Router = Router();

// GET /api/directives?agentId=... — list directives for an agent
directivesRouter.get('/', (req, res) => {
  const { agentId } = req.query;
  if (!agentId) {
    res.status(400).json({ error: 'agentId query param required' });
    return;
  }
  const directives = getAllDirectivesForAgent(String(agentId));
  res.json(directives);
});

// POST /api/directives — add a directive to an agent
directivesRouter.post('/', (req, res) => {
  try {
    const { agentId, condition, action, maxAmount, cooldown } = req.body;
    if (!agentId || !condition || !action) {
      res.status(400).json({ error: 'agentId, condition, and action are required' });
      return;
    }
    const result = addDirective(agentId, condition, action, maxAmount, cooldown ?? 0);
    res.status(201).json({ id: Number(result.lastInsertRowid), agentId, condition, action });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// PATCH /api/directives/:id — toggle active/inactive
directivesRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    toggleDirective(Number(id), Boolean(isActive));
    res.json({ id: Number(id), isActive });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE /api/directives/:id — remove a directive
directivesRouter.delete('/:id', (req, res) => {
  try {
    deleteDirective(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
