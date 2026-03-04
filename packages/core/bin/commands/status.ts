import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function registerStatusCommand(program: Command) {
  program
    .command('status')
    .description('Check if the Sigil background daemon is running')
    .action(() => {
      const pidFile = path.join(os.homedir(), '.sigil', 'run.pid');
      
      if (!fs.existsSync(pidFile)) {
        clack.log.warn('Sigil is NOT running (no pidfile).');
        return;
      }

      const pidStr = fs.readFileSync(pidFile, 'utf8');
      const pid = parseInt(pidStr, 10);
      
      try {
        // Sending signal 0 checks if the process exists without killing it
        process.kill(pid, 0); 
        clack.log.success(`Sigil is running (PID: ${pid}).`);
      } catch (e: any) {
        if (e.code === 'ESRCH') {
          clack.log.warn(`Sigil is NOT running (PID ${pid} is stale).`);
        } else {
          clack.log.error(`Sigil status unknown (Error: ${e.message})`);
        }
      }
    });
}
