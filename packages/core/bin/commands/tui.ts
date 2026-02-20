  import { Command } from 'commander';

import { startTui } from 'sigil-tui';
import { getAuthToken } from '../../src/lib/Config.js';

export function register(program: Command) {
  program
    .command('tui')
    .description('Launch the Terminal User Interface')
    .action(async () => {
      const token = getAuthToken();
      if (!token) {
        console.error('Error: No auth token found. Run "sigil init" first.');
        process.exit(1);
      }

      const API_PORT = 7445;
      // Clear screen before starting TUI
      console.clear();
      const app = startTui(API_PORT, token);
      await app.waitUntilExit();
    });
}
