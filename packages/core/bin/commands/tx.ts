import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { getAgentTransactions, getDatabase } from '../../src/lib/Database.js';

export function registerTxCommand(program: Command) {
  program
    .command('tx <agent>')
    .option('-n, --limit <count>', 'Number of transactions', '20')
    .description('View an agent\'s transactions')
    .action((agent: string, opts: { limit: string }) => {
      getDatabase();
      const a = agentManager.get(agent);
      if (!a) { console.log(`Agent "${agent}" not found.`); return; }
      const txs = getAgentTransactions(a.id, Number(opts.limit));
      if (txs.length === 0) { console.log('No transactions yet.'); return; }
      for (const tx of txs.reverse()) {
        const sig = tx.signature ? tx.signature.slice(0, 16) + '...' : '(pending)';
        console.log(`[${tx.timestamp}] ${tx.type} ${tx.amount ?? ''} ${tx.token ?? ''} → ${tx.status} | ${sig}`);
      }
    });
}
