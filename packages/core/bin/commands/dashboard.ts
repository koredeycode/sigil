import type { Command } from 'commander';
import open from 'open';
import { getAuthToken } from '../../src/lib/Config.js';
import { getDatabase } from '../../src/lib/Database.js';

export function registerDashboardCommand(program: Command) {
  program
    .command('dashboard')
    .description('Open the Sigil UI dashboard in your default browser')
    .action(async () => {
      getDatabase();
      const token = getAuthToken();

      if (!token) {
        console.error('No session token found. Have you run `sigil start`?');
        process.exit(1);
      }

      console.log('Opening Sigil Dashboard...');
      const url = `http://localhost:7446/#token=${token}`;
      await open(url);
    });
}
