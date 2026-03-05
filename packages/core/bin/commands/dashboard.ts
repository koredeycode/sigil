import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import open from 'open';

export function registerDashboardCommand(program: Command) {
  program
    .command('dashboard')
    .description('Open the Sigil Wallet UI dashboard in your default browser')
    .action(async () => {
      const { getAuthToken } = await import('../../src/lib/Config.js');
      const { getDatabase } = await import('../../src/lib/Database.js');
      
      getDatabase();
      const token = getAuthToken();

      if (!token) {
        clack.log.error('No session token found. Have you run `sigil start`?');
        process.exit(1);
      }

      const s = clack.spinner();
      s.start('Opening Sigil Wallet Dashboard...');
      const url = `http://localhost:7445/#token=${token}`;
      await open(url);
      s.stop('Dashboard opened.');
    });
}
