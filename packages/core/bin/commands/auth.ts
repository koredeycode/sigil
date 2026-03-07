import * as clack from '@clack/prompts';
import type { Command } from 'commander';

export function registerAuthCommand(program: Command) {
  const auth = program.command('auth').description('Auth management');

  auth
    .command('rotate')
    .description('Rotate the session token')
    .action(async () => {
      const { createSessionToken } = await import(new URL('../../src/lib/Auth.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);
      
      getDatabase();
      const token = createSessionToken();
      clack.log.success(`New session token: ${token}`);
    });
}
