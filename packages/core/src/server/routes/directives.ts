import { Router } from 'express';
import {
    addDirective,
    deleteDirective,
    getAllDirectivesForAgent,
    toggleDirective,
    updateDirective,
} from '../../lib/Database.js';

export const directivesRouter: Router = Router();

// GET /api/directives?agentId=... — list directives for an agent
directivesRouter.get('/', (req, res) => {
  const { agentId } = req.query;
  if (!agentId) {
    res.status(400).json({ message: 'agentId query param required', data: null });
    return;
  }
  const directives = getAllDirectivesForAgent(String(agentId));
  res.json({ message: 'Directives retrieved successfully', data: directives });
});

// POST /api/directives — add a directive to an agent
directivesRouter.post('/', (req, res) => {
  try {
    const { agentId, condition, action, maxAmount, cooldown } = req.body;
    if (!agentId || !condition || !action) {
      res.status(400).json({ message: 'agentId, condition, and action are required', data: null });
      return;
    }
    const result = addDirective(agentId, condition, action, maxAmount, cooldown ?? 0);
    res.status(201).json({ message: 'Directive created successfully', data: { id: Number(result.lastInsertRowid), agentId, condition, action } });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// PATCH /api/directives/:id — toggle active/inactive
directivesRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    toggleDirective(Number(id), Boolean(isActive));
    res.json({ message: 'Directive toggled successfully', data: { id: Number(id), isActive } });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// PUT /api/directives/:id — update directive contents
directivesRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { condition, action, maxAmount, cooldown } = req.body;
    if (!condition || !action) {
      res.status(400).json({ message: 'condition and action are required', data: null });
      return;
    }
    updateDirective(Number(id), condition, action, maxAmount, cooldown);
    res.json({ message: 'Directive updated successfully', data: { id: Number(id), condition, action } });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// DELETE /api/directives/:id — remove a directive
directivesRouter.delete('/:id', (req, res) => {
  try {
    deleteDirective(Number(req.params.id));
    res.status(204).json({ message: 'Directive deleted', data: null });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});
