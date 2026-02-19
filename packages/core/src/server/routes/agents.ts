import { Router } from 'express';
import { agentManager } from '../../agent/AgentManager.js';

export const agentsRouter: Router = Router();

// GET /api/agents — list all agents
agentsRouter.get('/', (_req, res) => {
  const agents = agentManager.list();
  res.json(agents);
});

// POST /api/agents — create a new agent
agentsRouter.post('/', async (req, res) => {
  try {
    const { name, loopInterval } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Agent name is required' });
      return;
    }
    const agent = await agentManager.create(name, loopInterval);
    res.status(201).json(agent);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
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
        res.status(400).json({ error: `Unknown action: ${action}` });
        return;
    }

    const agent = agentManager.get(id);
    res.json(agent);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// DELETE /api/agents/:id — destroy an agent
agentsRouter.delete('/:id', async (req, res) => {
  try {
    await agentManager.destroy(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
