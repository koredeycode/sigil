import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { getAgentLogs, getDatabase } from '../../src/lib/Database.js';

export function registerLogsCommand(program: Command) {
  program
    .command('logs [agent]')
    .option('-n, --tail <count>', 'Number of log entries', '20')
    .description('View an agent\'s recent activity')
    .action(async (agent?: string, opts?: { tail: string }) => {
      getDatabase();

      if (!agent) {
        const agents = agentManager.list();
        if (agents.length === 0) {
          clack.log.warning('No agents found. Run `sigil agent create` first.');
          process.exit(0);
        }

        const selected = await clack.select({
          message: 'View logs for which agent?',
          options: agents.map(a => ({
            value: a.name,
            label: a.name,
            hint: `${a.status}`,
          })),
        });
        if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
        agent = String(selected);
      }

      const a = agentManager.get(agent);
      if (!a) { console.log(`Agent "${agent}" not found.`); return; }
      const logs = getAgentLogs(a.id, Number(opts?.tail ?? '20'));
      if (logs.length === 0) { console.log('No logs yet.'); return; }
      for (const log of logs.reverse()) {
        console.log(`[${log.timestamp}] ${log.action}: ${log.result ?? ''}`);
      }
    });
}
