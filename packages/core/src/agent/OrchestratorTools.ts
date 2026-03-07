import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import {
    deleteCronJob,
    getAgent,
    getAgentLogs,
    getCronJobsForAgent,
    insertCronJob,
    toggleCronJob,
    updateCronJob
} from '../lib/Database.js';
// agentManager will be imported dynamically to break circular dependency
import { cronScheduler } from './CronScheduler.js';

/**
 * Create orchestrator tools exclusive to the Sigil master agent.
 * These provide multi-agent management and cron scheduling capabilities.
 */
export function createOrchestratorTools(): DynamicStructuredTool[] {
  return [
    // ─── Agent Management ─────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'manage_agent',
      description: 'Create, start, pause, or destroy sub-agents.',
      schema: z.object({
        action: z.enum(['create', 'start', 'pause', 'destroy']).describe('The action to perform'),
        name: z.string().describe('Name of the target agent (e.g., trader, researcher)'),
        loopInterval: z.number().optional().describe('Interval in ms for autonomous cycle (create only)'),
        prompt: z.string().optional().describe('System prompt / personality for the agent (create only)')
      }),
      func: async ({ action, name, loopInterval, prompt }) => {
        try {
          const { agentManager } = await import('./AgentManager.js');
          switch (action) {
            case 'create':
              await agentManager.create(name, loopInterval || 60000, undefined, prompt);
              return `Agent ${name} created successfully.`;
            case 'start':
              await agentManager.start(name);
              return `Agent ${name} started successfully.`;
            case 'pause':
              agentManager.pause(name);
              return `Agent ${name} paused successfully.`;
            case 'destroy':
              await agentManager.destroy(name);
              return `Agent ${name} destroyed successfully.`;
            default:
              return `Unknown action ${action}`;
          }
        } catch (e) {
          return `Failed to ${action} agent ${name}: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }),
    new DynamicStructuredTool({
      name: 'list_agents',
      description: 'Get a list of all instantiated agents and their statuses.',
      schema: z.object({}),
      func: async () => {
        try {
          const { agentManager } = await import('./AgentManager.js');
          const agents = agentManager.list();
          return JSON.stringify(agents.map(a => ({ 
            id: a.id, 
            name: a.name, 
            status: a.status,
            pubkey: a.pubkey,
            loop_interval: a.loop_interval,
            created_at: a.created_at
          })), null, 2);
        } catch (e) {
          return `Failed to list agents: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }),
    new DynamicStructuredTool({
      name: 'get_agent_info',
      description: 'Get detailed information about a specific agent by name or ID, including its cron job count.',
      schema: z.object({
        nameOrId: z.string().describe('The name or ID of the agent to look up')
      }),
      func: async ({ nameOrId }) => {
        try {
          const { agentManager } = await import('./AgentManager.js');
          const agent = agentManager.get(nameOrId);
          if (!agent) return `Agent "${nameOrId}" not found.`;
          const crons = getCronJobsForAgent(agent.id);
          const activeCrons = crons.filter(c => c.is_active);
          return JSON.stringify({
            id: agent.id,
            name: agent.name,
            status: agent.status,
            pubkey: agent.pubkey,
            loop_interval: agent.loop_interval,
            prompt: agent.prompt,
            created_at: agent.created_at,
            cron_jobs_total: crons.length,
            cron_jobs_active: activeCrons.length,
          }, null, 2);
        } catch (e) {
          return `Failed to get agent info: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }),
    new DynamicStructuredTool({
      name: 'get_agent_logs',
      description: 'Fetch the most recent logs for a specific agent.',
      schema: z.object({
        nameOrId: z.string().describe('The name or ID of the agent'),
        limit: z.number().optional().describe('Maximum number of logs to return (default 20)')
      }),
      func: async ({ nameOrId, limit }) => {
        try {
          const { agentManager } = await import('./AgentManager.js');
          const agent = agentManager.get(nameOrId);
          if (!agent) return `Agent "${nameOrId}" not found.`;
          const logs = getAgentLogs(agent.id, limit || 20);
          if (logs.length === 0) return `No logs found for agent "${agent.name}".`;
          return JSON.stringify(logs.map(l => ({
            id: l.id,
            timestamp: l.timestamp,
            action: l.action,
            result: l.result,
            thought: l.thought,
          })), null, 2);
        } catch (e) {
          return `Failed to get agent logs: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }),

    // ─── Cron Job Management ──────────────────────────────────────
    new DynamicStructuredTool({
      name: 'schedule_cron_job',
      description: 'Schedule a cron job to send a prompt to an agent at given intervals.',
      schema: z.object({
        name: z.string().describe('A descriptive name for this scheduled task'),
        expression: z.string().describe('Cron expression (e.g. "*/5 * * * *")'),
        targetAgentName: z.string().describe('The name of the target agent to send the prompt to'),
        prompt: z.string().describe('The prompt/task to run when the cron triggers')
      }),
      func: async ({ name, expression, targetAgentName, prompt }) => {
        try {
          const agent = getAgent(targetAgentName);
          if (!agent) return `Agent ${targetAgentName} not found.`;
          const jobId = insertCronJob(agent.id, name, expression, prompt);
          cronScheduler.schedule(String(jobId), expression, agent.id, agent.name, prompt);
          return `Cron job ${jobId} ('${name}') scheduled for agent ${targetAgentName} with expression ${expression}.`;
        } catch (e) {
          return `Failed to schedule cron job: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }),
    new DynamicStructuredTool({
      name: 'list_cron_jobs',
      description: 'List all cron jobs for a specific agent, including their ID, schedule, active status, and last run time.',
      schema: z.object({
        targetAgentName: z.string().describe('The name or ID of the agent to list cron jobs for')
      }),
      func: async ({ targetAgentName }) => {
        try {
          const agent = getAgent(targetAgentName);
          if (!agent) return `Agent "${targetAgentName}" not found.`;
          const jobs = getCronJobsForAgent(agent.id);
          if (jobs.length === 0) return `No cron jobs found for agent "${agent.name}".`;
          return JSON.stringify(jobs.map(j => ({
            id: j.id,
            name: j.name,
            expression: j.expression,
            task_prompt: j.task_prompt,
            active: !!j.is_active,
            last_run: j.last_run || 'Never',
            created_at: j.created_at,
          })), null, 2);
        } catch (e) {
          return `Failed to list cron jobs: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }),
    new DynamicStructuredTool({
      name: 'update_cron_job',
      description: 'Update an existing cron job\'s name, cron expression, or task prompt.',
      schema: z.object({
        jobId: z.number().describe('The ID of the cron job to update'),
        name: z.string().describe('New name for the scheduled task'),
        expression: z.string().describe('New cron expression (e.g. "0 */2 * * *")'),
        prompt: z.string().describe('New prompt/task to run when the cron triggers')
      }),
      func: async ({ jobId, name, expression, prompt }) => {
        try {
          const { getCronJob: getCron } = await import('../lib/Database.js');
          const job = getCron(jobId);
          if (!job) return `Cron job ${jobId} not found.`;

          updateCronJob(jobId, name, expression, prompt);

          // Reschedule if active
          if (job.is_active) {
            cronScheduler.cancel(String(jobId));
            const agent = getAgent(job.agent_id);
            if (agent && agent.status === 'running') {
              cronScheduler.schedule(String(jobId), expression, job.agent_id, agent.name, prompt);
            }
          }

          return `Cron job ${jobId} updated successfully. Name: "${name}", Expression: "${expression}".`;
        } catch (e) {
          return `Failed to update cron job ${jobId}: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }),
    new DynamicStructuredTool({
      name: 'toggle_cron_job',
      description: 'Activate or deactivate an existing cron job.',
      schema: z.object({
        jobId: z.number().describe('The ID of the cron job to toggle'),
        active: z.boolean().describe('Set to true to activate, false to deactivate')
      }),
      func: async ({ jobId, active }) => {
        try {
          const { getCronJob: getCron } = await import('../lib/Database.js');
          const job = getCron(jobId);
          if (!job) return `Cron job ${jobId} not found.`;

          toggleCronJob(jobId, active);

          if (active) {
            const agent = getAgent(job.agent_id);
            if (agent && agent.status === 'running') {
              cronScheduler.schedule(String(jobId), job.expression, job.agent_id, agent.name, job.task_prompt);
            }
          } else {
            cronScheduler.cancel(String(jobId));
          }

          return `Cron job ${jobId} ("${job.name}") ${active ? 'activated' : 'deactivated'} successfully.`;
        } catch (e) {
          return `Failed to toggle cron job ${jobId}: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }),
    new DynamicStructuredTool({
      name: 'cancel_cron_job',
      description: 'Cancel and permanently delete a scheduled cron job using its ID.',
      schema: z.object({
        jobId: z.number().describe('The ID of the cron job to cancel')
      }),
      func: async ({ jobId }) => {
        try {
          deleteCronJob(jobId);
          cronScheduler.cancel(String(jobId));
          return `Cron job ${jobId} canceled successfully.`;
        } catch (e) {
          return `Failed to cancel cron job ${jobId}: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    })
  ];
}
