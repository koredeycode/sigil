import cron from 'node-cron';
import {
    getAgent,
    getAllActiveCronJobs,
    updateCronJobLastRun
} from '../lib/Database.js';
import { invokeSolanaAgent, runAutonomousCycle } from './AgentLoop.js';
import { agentManager } from './AgentManager.js';

/**
 * CronScheduler — manages scheduled tasks for agents.
 * 
 * Supports two types of scheduled work:
 * 1. Autonomous cycles: periodically evaluate the agent environment
 * 2. Custom cron jobs: user-defined scheduled prompts to the agent
 */
class CronScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private autonomousTasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Schedule a custom cron job.
   */
  schedule(jobId: string, expression: string, agentId: string, agentName: string, prompt: string): void {
    // Cancel existing if present
    this.cancel(jobId);

    if (!cron.validate(expression)) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    const task = cron.schedule(expression, async () => {
      console.info(`[Cron:${jobId}] Running scheduled task for ${agentName}`);

      const agent = getAgent(agentId);
      if (!agent || agent.status !== 'running') {
        console.info(`[Cron:${jobId}] Agent not running, skipping`);
        return;
      }

      try {
        await invokeSolanaAgent(agentId, agentName, prompt);
        updateCronJobLastRun(parseInt(jobId, 10));
      } catch (error) {
        console.error(`[Cron:${jobId}] Error:`, error);
        agentManager.emit('agent:error', {
          agent: agentName,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    });

    this.tasks.set(jobId, task);
    console.info(`[Cron] Scheduled job ${jobId} (${expression}) for ${agentName}`);
  }

  /**
   * Start autonomous evaluation cycle for an agent.
   */
  startAutonomousCycle(agentId: string, agentName: string, intervalMs: number): void {
    this.stopAutonomousCycle(agentId);

    // Convert interval to a cron expression (minimum 1 minute)
    const minutes = Math.max(1, Math.round(intervalMs / 60000));
    const expression = minutes === 1 ? '* * * * *' : `*/${minutes} * * * *`;

    const task = cron.schedule(expression, async () => {
      const agent = getAgent(agentId);
      if (!agent || agent.status !== 'running') return;

      try {
        await runAutonomousCycle(agentId, agentName);
      } catch (error) {
        console.error(`[Cron:autonomous:${agentName}] Error:`, error);
      }
    });

    this.autonomousTasks.set(agentId, task);
    console.info(`[Cron] Started autonomous cycle for ${agentName} (every ${minutes} min)`);
  }

  /**
   * Stop autonomous evaluation cycle for an agent.
   */
  stopAutonomousCycle(agentId: string): void {
    const task = this.autonomousTasks.get(agentId);
    if (task) {
      task.stop();
      this.autonomousTasks.delete(agentId);
    }
  }

  /**
   * Cancel a scheduled cron job.
   */
  cancel(jobId: string): void {
    const task = this.tasks.get(jobId);
    if (task) {
      task.stop();
      this.tasks.delete(jobId);
    }
  }

  /**
   * Load all active cron jobs from the database and start them.
   */
  loadAll(): void {
    const jobs = getAllActiveCronJobs();
    for (const job of jobs) {
      const agent = getAgent(job.agent_id);
      if (agent && agent.status === 'running') {
        this.schedule(
          String(job.id),
          job.expression,
          job.agent_id,
          agent.name,
          job.task_prompt
        );
      }
    }
    console.info(`[Cron] Loaded ${jobs.length} active cron jobs`);
  }

  /**
   * Load autonomous cycles for all running agents.
   */
  loadAutonomousCycles(): void {
    const agents = agentManager.list();
    for (const agent of agents) {
      if (agent.status === 'running') {
        this.startAutonomousCycle(agent.id, agent.name, agent.loop_interval);
      }
    }
  }

  /**
   * Get info about all active scheduled tasks.
   */
  listActive(): { cronJobs: number; autonomousCycles: number } {
    return {
      cronJobs: this.tasks.size,
      autonomousCycles: this.autonomousTasks.size,
    };
  }

  /**
   * Stop all scheduled tasks.
   */
  shutdown(): void {
    for (const [, task] of this.tasks) {
      task.stop();
    }
    this.tasks.clear();

    for (const [, task] of this.autonomousTasks) {
      task.stop();
    }
    this.autonomousTasks.clear();
    console.info('[Cron] All scheduled tasks stopped');
  }
}

// Singleton instance
export const cronScheduler = new CronScheduler();
