import { Router } from 'express';
import cron from 'node-cron';
import { cronScheduler } from '../../agent/CronScheduler.js';
import { deleteCronJob, getAgent, getCronJob, getCronJobsForAgent, insertCronJob, toggleCronJob, updateCronJob } from '../../lib/Database.js';

export const cronRouter: Router = Router();

// GET /api/cron/:agentId — list cron jobs for an agent
cronRouter.get('/:agentId', (req, res) => {
  try {
    const jobs = getCronJobsForAgent(req.params.agentId);
    res.json({ message: 'Success', data: jobs });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// POST /api/cron — create a cron job
cronRouter.post('/', (req, res) => {
  try {
    const { agentId, name, expression, taskPrompt } = req.body;

    if (!agentId || !name || !expression || !taskPrompt) {
      res.status(400).json({ message: 'agentId, name, expression, and taskPrompt are required', data: null });
      return;
    }

    if (!cron.validate(expression)) {
      res.status(400).json({ message: `Invalid cron expression: ${expression}`, data: null });
      return;
    }

    const agent = getAgent(agentId);
    if (!agent) {
      res.status(404).json({ message: `Agent "${agentId}" not found`, data: null });
      return;
    }

    insertCronJob(agentId, name, expression, taskPrompt);

    // If agent is running, schedule immediately
    const jobs = getCronJobsForAgent(agentId);
    const newJob = jobs[0]; // Most recent
    if (agent.status === 'running' && newJob) {
      cronScheduler.schedule(String(newJob.id), expression, agentId, agent.name, taskPrompt);
    }

    res.status(201).json({ message: 'Cron job created', data: newJob });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// PATCH /api/cron/:id — toggle active/inactive
cronRouter.patch('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      res.status(400).json({ message: 'active (boolean) is required', data: null });
      return;
    }

    const job = getCronJob(id);
    if (!job) {
      res.status(404).json({ message: 'Cron job not found', data: null });
      return;
    }

    toggleCronJob(id, active);

    if (active) {
      const agent = getAgent(job.agent_id);
      if (agent && agent.status === 'running') {
        cronScheduler.schedule(String(id), job.expression, job.agent_id, agent.name, job.task_prompt);
      }
    } else {
      cronScheduler.cancel(String(id));
    }

    res.json({ message: `Cron job ${active ? 'activated' : 'deactivated'}`, data: { id, active } });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// PUT /api/cron/:id — update a cron job
cronRouter.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, expression, taskPrompt } = req.body;

    if (!name || !expression || !taskPrompt) {
      res.status(400).json({ message: 'name, expression, and taskPrompt are required', data: null });
      return;
    }

    if (!cron.validate(expression)) {
      res.status(400).json({ message: `Invalid cron expression: ${expression}`, data: null });
      return;
    }

    const job = getCronJob(id);
    if (!job) {
      res.status(404).json({ message: 'Cron job not found', data: null });
      return;
    }

    updateCronJob(id, name, expression, taskPrompt);

    // Reschedule if active
    if (job.is_active) {
      cronScheduler.cancel(String(id));
      const agent = getAgent(job.agent_id);
      if (agent && agent.status === 'running') {
        cronScheduler.schedule(String(id), expression, job.agent_id, agent.name, taskPrompt);
      }
    }

    const updated = getCronJob(id);
    res.json({ message: 'Cron job updated', data: updated });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// DELETE /api/cron/:id — delete a cron job
cronRouter.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    cronScheduler.cancel(String(id));
    deleteCronJob(id);
    res.status(204).json({ message: 'Cron job deleted', data: null });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});
