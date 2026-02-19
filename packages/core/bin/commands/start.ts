import type { Command } from 'commander';
import { runCycle } from '../../src/agent/AgentLoop.js';
import { agentManager } from '../../src/agent/AgentManager.js';
import { createSessionToken } from '../../src/lib/Auth.js';
import { getDatabase } from '../../src/lib/Database.js';
import { startServer } from '../../src/server/app.js';

export function registerStartCommand(program: Command) {
  program
    .command('start')
    .description('Boot the API server and start all active agent loops')
    .action(async () => {
      console.log('\n  ⎔ Sigil — Starting...\n');

      getDatabase();
      const token = createSessionToken();

      // Wire up the cycle runner
      agentManager.setCycleRunner(runCycle);

      // Start the API server
      await startServer();

      // Start all non-killed agents
      await agentManager.startAll();

      const agents = agentManager.list();
      console.log(`  Session Token: ${token}`);
      console.log(`  Agents: ${agents.length} loaded\n`);
    });
}
