import * as clack from '@clack/prompts';
import { Command } from 'commander';

export function register(program: Command) {
  program
    .command('tui')
    .description('Launch the Terminal User Interface')
    .action(async () => {
      const { getAuthToken } = await import('../../src/lib/Config.js');
      const token = getAuthToken();
      
      if (!token) {
        clack.log.error('Error: No auth token found. Run "sigil init" first.');
        process.exit(1);
      }

      const API_PORT = 7445;
      // Clear screen before starting TUI
      console.clear();
      const { startTui } = await import('sigil-tui');
      const app = startTui(API_PORT, token);
      await app.waitUntilExit();
    });
}
