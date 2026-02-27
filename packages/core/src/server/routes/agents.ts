import { Router } from 'express';
import { agentManager } from '../../agent/AgentManager.js';
import { getAgentLogs } from '../../lib/Database.js';

export const agentsRouter: Router = Router();

// GET /api/agents — list all agents
agentsRouter.get('/', (_req, res) => {
  const agents = agentManager.list();
  res.json({ message: 'Success', data: agents });
});

// POST /api/agents — create a new agent
agentsRouter.post('/', async (req, res) => {
  try {
    const { name, loopInterval, privateKey, prompt } = req.body;
    if (!name || typeof name !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      res.status(400).json({ message: 'Invalid agent name. Use only alphanumeric characters, dashes, or underscores.', data: null });
      return;
    }
    const agent = await agentManager.create(name, loopInterval, privateKey, prompt);
    res.status(201).json({ message: 'Agent created successfully', data: agent });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// PATCH /api/agents/:id — update agent (start/pause/kill)
agentsRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    switch (action) {
      case 'start':
        await agentManager.start(id);
        break;
      case 'pause':
        agentManager.pause(id);
        break;
      case 'kill':
        agentManager.kill(id);
        break;
      default:
        res.status(400).json({ message: `Unknown action: ${action}`, data: null });
        return;
    }

    const agent = agentManager.get(id);
    res.json({ message: `Agent action '${action}' successful`, data: agent });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// PUT /api/agents/:id — update agent profile (name, interval)
agentsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, loopInterval } = req.body;
    
    if (!name || typeof name !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(name) || !loopInterval) {
      res.status(400).json({ message: 'Invalid name or missing loopInterval. Name must use only alphanumeric characters, dashes, or underscores.', data: null });
      return;
    }

    const agent = await agentManager.update(id, name, loopInterval);
    // Broadcast update
    agentManager.emit('agent:updated', agent);
    
    res.json({ message: 'Agent profile updated', data: agent });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// DELETE /api/agents/:id — destroy an agent
agentsRouter.delete('/:id', async (req, res) => {
  try {
    await agentManager.destroy(req.params.id);
    res.status(204).json({ message: 'Agent destroyed', data: null });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// GET /api/agents/:id/logs — fetch historical logs
agentsRouter.get('/:id/logs', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const logs = getAgentLogs(req.params.id, limit);
    res.json({ message: 'Success', data: logs });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});
