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
        console.log('Sigil is NOT running (no pidfile).');
        return;
      }

      const pidStr = fs.readFileSync(pidFile, 'utf8');
      const pid = parseInt(pidStr, 10);
      
      try {
        // Sending signal 0 checks if the process exists without killing it
        process.kill(pid, 0); 
        console.log(`Sigil is running (PID: ${pid}).`);
      } catch (e: any) {
        if (e.code === 'ESRCH') {
          console.log(`Sigil is NOT running (PID ${pid} is stale).`);
        } else {
          console.log(`Sigil status unknown (Error: ${e.message})`);
        }
      }
    });
}
