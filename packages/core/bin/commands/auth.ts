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

  auth
    .command('token')
    .description('Show the current session token')
    .action(async () => {
      const { getAuthToken } = await import(new URL('../../src/lib/Config.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const token = getAuthToken();

      if (!token) {
        clack.log.error('No session token found. Run `sigil start` to generate one.');
        process.exit(1);
      }

      clack.note(token, 'Current Session Token');
      clack.log.info('Use this token to authenticate in the Web UI or Browser Extension.');
    });
}
