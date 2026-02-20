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
        console.log('No background agent is currently running (pidfile not found).');
        return;
      }

      const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
      try {
        process.kill(pid); // Sending SIGTERM
        console.log(`Sigil background process (PID ${pid}) stopped.`);
      } catch (err: any) {
        // ESRCH = No such process
        if (err.code === 'ESRCH') {
          console.log(`Process ${pid} is not running. Cleaning up stale pidfile.`);
        } else {
          console.error(`Failed to stop process ${pid}: ${err.message}`);
        }
      }

      // Always remove the PID file
      try {
        fs.unlinkSync(pidFile);
      } catch (e) {
        // ignore
      }
    });
}
