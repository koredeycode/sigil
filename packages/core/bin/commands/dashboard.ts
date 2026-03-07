import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import open from 'open';

export function registerDashboardCommand(program: Command) {
  program
    .command('dashboard')
    .description('Open the Sigil Wallet UI dashboard in your default browser')
    .action(async () => {
      const { getAuthToken } = await import(new URL('../../src/lib/Config.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);
      
      getDatabase();
      const token = getAuthToken();

      if (!token) {
        clack.log.error('No session token found. Have you run `sigil start`?');
        process.exit(1);
      }

      const s = clack.spinner();
      s.start('Opening Sigil Wallet Dashboard...');
      const url = `http://localhost:7445/#token=${token}`;
      try {
        await open(url);
        s.stop('Dashboard opened.');
      } catch (err) {
        s.stop('Failed to open browser automatically.');
      }

      clack.log.info('If the dashboard didn\'t open, you can access it manually:');
      clack.note(url, 'Dashboard URL');
    });
}
