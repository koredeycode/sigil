import * as clack from '@clack/prompts';
import type { Command } from 'commander';

export function registerAuthCommand(program: Command) {
  const auth = program.command('auth').description('Auth management');

  auth
    .command('rotate')
    .description('Rotate the session token')
    .action(async () => {
      const { createSessionToken } = await import('../../src/lib/Auth.js');
      const { getDatabase } = await import('../../src/lib/Database.js');
      
      getDatabase();
      const token = createSessionToken();
      clack.log.success(`New session token: ${token}`);
    });
}
