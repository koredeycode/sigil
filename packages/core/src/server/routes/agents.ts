import { Router } from 'express';
import { agentManager } from '../../agent/AgentManager.js';

export const agentsRouter: Router = Router();

// GET /api/agents — list all agents
agentsRouter.get('/', (_req, res) => {
  const agents = agentManager.list();
  res.json({ message: 'Success', data: agents });
});

// POST /api/agents — create a new agent
agentsRouter.post('/', async (req, res) => {
  try {
    const { name, loopInterval } = req.body;
    if (!name) {
      res.status(400).json({ message: 'Agent name is required', data: null });
      return;
    }
    const agent = await agentManager.create(name, loopInterval);
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

// DELETE /api/agents/:id — destroy an agent
agentsRouter.delete('/:id', async (req, res) => {
  try {
    await agentManager.destroy(req.params.id);
    res.status(204).json({ message: 'Agent destroyed', data: null });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});
