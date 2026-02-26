import type { Command } from 'commander';
import { getConfig, setConfig } from '../../src/lib/Database.js';

export function registerConfigCommand(program: Command) {
  const config = program
    .command('config')
    .description('View and update Sigil configuration');

  // sigil config list
  config
    .command('list')
    .description('Show all configuration values')
    .action(() => {
      const { getDatabase } = require('../../src/lib/Database.js');
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

      console.log('\n  ⎔ Sigil Configuration\n');
      console.log('  ┌─────────────────────────────┬────────────────────────┐');
      console.log('  │ Key                         │ Value                  │');
      console.log('  ├─────────────────────────────┼────────────────────────┤');

      for (const key of keys) {
        const value = getConfig(key);
        const displayValue = key === 'auth_token' && value
          ? `${value.substring(0, 8)}...`
          : (value ?? '(not set)');
        console.log(`  │ ${key.padEnd(27)} │ ${displayValue.padEnd(22)} │`);
      }

      console.log('  └─────────────────────────────┴────────────────────────┘\n');
    });

  // sigil config get <key>
  config
    .command('get <key>')
    .description('Get a configuration value')
    .action((key: string) => {
      const { getDatabase } = require('../../src/lib/Database.js');
      getDatabase();

      const value = getConfig(key);
      if (value !== undefined) {
        console.log(`  ${key} = ${value}`);
      } else {
        console.log(`  Config key "${key}" is not set.`);
      }
    });

  // sigil config set <key> <value>
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      const { getDatabase } = require('../../src/lib/Database.js');
      getDatabase();

      setConfig(key, value);
      console.log(`  ✔ ${key} = ${value}`);
    });
}
