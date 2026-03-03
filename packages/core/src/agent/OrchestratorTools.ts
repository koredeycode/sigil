import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { deleteCronJob, getAgent, insertCronJob } from '../lib/Database.js';
import { agentManager } from './AgentManager.js';
import { cronScheduler } from './CronScheduler.js';

/**
 * Create orchestrator tools exclusive to the Sigil master agent.
 * These provide multi-agent management and cron scheduling capabilities.
 */
export function createOrchestratorTools(): DynamicStructuredTool[] {
  return [
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
        } catch (e: any) {
          return `Failed to ${action} agent ${name}: ${e.message}`;
        }
      }
    }),
    new DynamicStructuredTool({
      name: 'list_agents',
      description: 'Get a list of all instantiated agents and their statuses.',
      schema: z.object({}),
      func: async () => {
        try {
          const agents = agentManager.list();
          return JSON.stringify(agents.map(a => ({ 
            id: a.id, 
            name: a.name, 
            status: a.status,
            pubkey: a.pubkey,
            loop_interval: a.loop_interval,
            created_at: a.created_at
          })), null, 2);
        } catch (e: any) {
          return `Failed to list agents: ${e.message}`;
        }
      }
    }),
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
        } catch (e: any) {
          return `Failed to schedule cron job: ${e.message}`;
        }
      }
    }),
    new DynamicStructuredTool({
      name: 'cancel_cron_job',
      description: 'Cancel a scheduled cron job using its ID.',
      schema: z.object({
        jobId: z.number().describe('The ID of the cron job to cancel')
      }),
      func: async ({ jobId }) => {
        try {
          deleteCronJob(jobId);
          cronScheduler.cancel(String(jobId));
          return `Cron job ${jobId} canceled successfully.`;
        } catch (e: any) {
          return `Failed to cancel cron job ${jobId}: ${e.message}`;
        }
      }
    })
  ];
}
