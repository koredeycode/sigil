import type { Command } from 'commander';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCycle } from '../../src/agent/AgentLoop.js';
import { agentManager } from '../../src/agent/AgentManager.js';
import { createSessionToken } from '../../src/lib/Auth.js';
import { getDatabase } from '../../src/lib/Database.js';
import { startServer } from '../../src/server/app.js';

export function registerStartCommand(program: Command) {
  program
    .command('start')
    .description('Boot the API server and start all active agent loops')
    .option('--fg', 'Run in the foreground instead of daemonizing')
    .action(async (options) => {
      const sigilDir = path.join(os.homedir(), '.sigil');
      if (!fs.existsSync(sigilDir)) fs.mkdirSync(sigilDir, { recursive: true });
      const pidFile = path.join(sigilDir, 'run.pid');

      // Check if already running
      if (fs.existsSync(pidFile)) {
        const existingPid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
        try {
          process.kill(existingPid, 0);
          console.log(`Sigil is already running (PID: ${existingPid}).`);
          console.log(`Run \`sigil stop\` first, or \`sigil dashboard\` to open the UI.`);
          process.exit(0);
        } catch (e) {
          // Stale pid file
          fs.unlinkSync(pidFile);
        }
      }

      if (options.fg) {
        // Run in foreground
        console.log('\n  ⎔ Sigil — Starting in foreground...\n');

        // Write own PID
        fs.writeFileSync(pidFile, String(process.pid));
        
        // Clean up on exit
        const cleanup = () => {
          if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
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

        // We use the same file we were executed with (e.g. dist/bin/cli.js)
        // and append the `start --fg` args
        const child = spawn(process.argv[0], [process.argv[1], 'start', '--fg'], {
          detached: true,
          stdio: 'ignore'
        });

        child.unref();

        if (child.pid !== undefined) {
          console.log(`  Daemon spawned with PID ${child.pid}`);
          console.log(`  Run \`sigil dashboard\` to instantly access the UI in a few moments.`);
          console.log(`  Run \`sigil logs\` to view daemon output, or \`sigil stop\` to kill it.\n`);
        } else {
          console.error('  Failed to get PID for spawned detached process.');
        }
        
        process.exit(0);
      }
    });
}
