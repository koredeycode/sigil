import * as clack from '@clack/prompts';
import type { Command } from 'commander';

export function registerHealthCommand(program: Command) {
  program
    .command('health')
    .description('Check the API health of the Sigil backend')
    .action(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const s = clack.spinner();
        s.start('Checking API health...');
        
        const res = await fetch('http://localhost:7445/api/status', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          s.stop(`Sigil API is healthy (Agents: ${data.data.agents.total})`);
        } else {
          s.stop(`Sigil API responded with status: ${res.status}`);
          clack.log.warn(`Sigil API responded with status: ${res.status}`);
        }
      } catch (error: any) {
        clack.log.error(`Sigil API is unreachable (${error.message || 'Connection refused'}).`);
      }
    });
}
