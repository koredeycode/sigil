import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function registerStopCommand(program: Command) {
  program
    .command('stop')
    .description('Stop the background Sigil daemon')
    .action(() => {
      const pidFile = path.join(os.homedir(), '.sigil', 'run.pid');
      
      if (!fs.existsSync(pidFile)) {
        clack.log.warn('No background agent is currently running (pidfile not found).');
        return;
      }

      const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
      try {
        const s = clack.spinner();
        s.start(`Stopping process ${pid}...`);
        process.kill(pid); // Sending SIGTERM
        s.stop(`Sigil background process (PID ${pid}) stopped.`);
      } catch (err: any) {
        // ESRCH = No such process
        if (err.code === 'ESRCH') {
          clack.log.info(`Process ${pid} is not running. Cleaning up stale pidfile.`);
        } else {
          clack.log.error(`Failed to stop process ${pid}: ${err.message}`);
        }
      }

      // Always remove the PID file
      try {
        fs.unlinkSync(pidFile);
      } catch (e) {
        // ignore
      }

      // Remove auto-start on boot (cross-platform, best-effort)
      import('../../src/lib/Startup.js').then(({ disableAutoStart }) => {
        disableAutoStart();
      }).catch(() => { /* ignore */ });
    });
}
