import * as clack from '@clack/prompts';
import type { Command } from 'commander';

export function registerConfigCommand(program: Command) {
  const config = program
    .command('config')
    .description('View and update Sigil configuration');

  // sigil config list
  config
    .command('list')
    .description('Show all configuration values')
    .action(async () => {
      const { getDatabase, getConfig } = await import('../../src/lib/Database.js');
      getDatabase(); // ensure DB is initialized

      const keys = [
        'kill_switch',
        'per_trade_limit',
        'daily_volume_cap',
        'slippage_cap',
        'cooldown_period',
        'confirmation_threshold',
        'auth_token',
      ];

      clack.log.info('Sigil Configuration');
      
      for (const key of keys) {
        const value = getConfig(key);
        const displayValue = key === 'auth_token' && value
          ? `${value.substring(0, 8)}...`
          : (value ?? '(not set)');
        clack.log.step(`${key.padEnd(25)} = ${displayValue}`);
      }
    });

  // sigil config get <key>
  config
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key: string) => {
      const { getDatabase, getConfig } = await import('../../src/lib/Database.js');
      getDatabase();

      const value = getConfig(key);
      if (value !== undefined) {
        clack.log.success(`${key} = ${value}`);
      } else {
        clack.log.warn(`Config key "${key}" is not set.`);
      }
    });

  // sigil config set <key> <value>
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key: string, value: string) => {
      const { getDatabase, setConfig } = await import('../../src/lib/Database.js');
      getDatabase();

      setConfig(key, value);
      clack.log.success(`${key} = ${value}`);
    });
}
