import type { Command } from 'commander';
import { runCycle } from '../../src/agent/AgentLoop.js';
import { agentManager } from '../../src/agent/AgentManager.js';
import { createSessionToken } from '../../src/lib/Auth.js';
import { getRunningPid, removePid, spawnDaemon, writePid } from '../../src/lib/Daemon.js';
import { getDatabase } from '../../src/lib/Database.js';
import { startServer } from '../../src/server/app.js';

export function registerStartCommand(program: Command) {
  program
    .command('start')
    .description('Boot the API server and start all active agent loops')
    .option('--fg', 'Run in the foreground instead of daemonizing')
    .action(async (options) => {
      const existingPid = getRunningPid();
      if (existingPid) {
        console.log(`Sigil is already running (PID: ${existingPid}).`);
        console.log(`Run \`sigil stop\` first, or \`sigil dashboard\` to open the UI.`);
        process.exit(0);
      }

      if (options.fg) {
        // Run in foreground
        console.log('\n  ⎔ Sigil — Starting in foreground...\n');

        // Write own PID
        writePid(process.pid);
        
        // Clean up on exit
        const cleanup = () => {
          removePid();
          process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

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
      } else {
        // Spawn background daemon
        console.log('\n  ⎔ Sigil — Starting background process...\n');

        try {
          const pid = await spawnDaemon();
          console.log(`  Daemon spawned with PID ${pid}`);
          console.log(`  Run \`sigil dashboard\` to instantly access the UI in a few moments.`);
          console.log(`  Run \`sigil logs\` to view daemon output, or \`sigil stop\` to kill it.\n`);
        } catch (error) {
          console.error(`  Failed to spawn daemon: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        process.exit(0);
      }
    });
}
