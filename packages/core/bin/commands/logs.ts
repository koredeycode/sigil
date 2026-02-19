import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { getAgentLogs, getDatabase } from '../../src/lib/Database.js';

export function registerLogsCommand(program: Command) {
  program
    .command('logs <agent>')
    .option('-n, --tail <count>', 'Number of log entries', '20')
    .description('View an agent\'s recent activity')
    .action((agent: string, opts: { tail: string }) => {
      getDatabase();
      const a = agentManager.get(agent);
      if (!a) { console.log(`Agent "${agent}" not found.`); return; }
      const logs = getAgentLogs(a.id, Number(opts.tail));
      if (logs.length === 0) { console.log('No logs yet.'); return; }
      for (const log of logs.reverse()) {
        console.log(`[${log.timestamp}] ${log.action}: ${log.result ?? ''}`);
      }
    });
}
