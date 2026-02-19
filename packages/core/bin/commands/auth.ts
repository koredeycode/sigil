import type { Command } from 'commander';
import { createSessionToken } from '../../src/lib/Auth.js';
import { getDatabase } from '../../src/lib/Database.js';

export function registerAuthCommand(program: Command) {
  const auth = program.command('auth').description('Auth management');

  auth
    .command('rotate')
    .description('Rotate the session token')
    .action(() => {
      getDatabase();
      const token = createSessionToken();
      console.log(`New session token: ${token}`);
    });
}
