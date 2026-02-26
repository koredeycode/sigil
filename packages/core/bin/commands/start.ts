import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { cronScheduler } from '../../src/agent/CronScheduler.js';
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
          cronScheduler.shutdown();
          agentManager.shutdown();
          removePid();
          process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

        getDatabase();
        const token = createSessionToken();

        // Start the API server
        await startServer();

        // Ensure main agent exists, auto-create on first boot
        let mainAgent = agentManager.getMainAgent();
        if (!mainAgent) {
          console.log('  ⓘ No agent found — initializing main agent...');
          mainAgent = await agentManager.initMainAgent();
          console.log(`  ✔ Main agent created. Wallet: ${mainAgent.pubkey}`);
        }

        // Start the main agent
        await agentManager.start();

        // Load and start cron jobs
        cronScheduler.loadAll();
        cronScheduler.loadDirectiveCycles();

        const agents = agentManager.list();
        const cronInfo = cronScheduler.listActive();
        console.log(`  Session Token: ${token}`);
        console.log(`  Agents: ${agents.length} loaded`);
        console.log(`  Cron Jobs: ${cronInfo.cronJobs} active, ${cronInfo.directiveCycles} directive cycles\n`);
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
