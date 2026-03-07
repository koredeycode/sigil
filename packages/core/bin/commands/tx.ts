import * as clack from '@clack/prompts';
import type { Command } from 'commander';

export function registerTxCommand(program: Command) {
  program
    .command('tx [agent]')
    .option('-n, --limit <count>', 'Number of transactions', '20')
    .description('View an agent\'s transactions')
    .action(async (agent?: string, opts?: { limit: string }) => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getAgentTransactions, getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);
      
      getDatabase();

      if (!agent) {
        const agents = agentManager.list();
        if (agents.length === 0) {
          clack.log.warning('No agents found. Run `sigil agent create` first.');
          process.exit(0);
        }

        const selected = await clack.select({
          message: 'View transactions for which agent?',
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
      if (!a) { clack.log.error(`Agent "${agent}" not found.`); return; }
      
      const s = clack.spinner();
      s.start(`Fetching transactions for agent ${agent}...`);
      const txs = getAgentTransactions(a.id, Number(opts?.limit ?? '20'));
      s.stop(`Fetched ${txs.length} transactions for ${agent}`);
      
      if (txs.length === 0) { clack.log.info('No transactions yet.'); return; }
      
      for (const tx of txs.reverse()) {
        const sig = tx.signature ? tx.signature.slice(0, 16) + '...' : '(pending)';
        clack.log.message(`[${tx.timestamp}] ${tx.type} ${tx.amount ?? ''} ${tx.token ?? ''} → ${tx.status} | ${sig}`);
      }
    });
}
