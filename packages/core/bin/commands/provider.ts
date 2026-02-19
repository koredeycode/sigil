import type { Command } from 'commander';
import { encryptApiKey } from '../../src/lib/Auth.js';
import { addProvider, getAllProviders, getDatabase, removeProvider, setPrimaryProvider } from '../../src/lib/Database.js';

export function registerProviderCommand(program: Command) {
  const provider = program.command('provider').description('Manage LLM providers');

  provider
    .command('add <name>')
    .option('-k, --key <key>', 'API key')
    .option('-m, --model <model>', 'Model name')
    .description('Add an LLM provider')
    .action((name: string, opts: { key?: string; model?: string }) => {
      getDatabase();
      const encKey = opts.key ? encryptApiKey(opts.key) : null;
      addProvider(name, encKey, opts.model ?? 'default', false);
      console.log(`Provider "${name}" added.`);
    });

  provider
    .command('list')
    .description('List all configured providers')
    .action(() => {
      getDatabase();
      const providers = getAllProviders();
      for (const p of providers) {
        const primary = p.is_primary ? ' ⭐ PRIMARY' : '';
        console.log(`[${p.id}] ${p.name} — ${p.model}${primary}`);
      }
    });

  provider
    .command('set-primary <id>')
    .description('Switch the active provider')
    .action((id: string) => {
      getDatabase();
      setPrimaryProvider(Number(id));
      console.log(`Provider ${id} set as primary.`);
    });

  provider
    .command('remove <id>')
    .description('Remove a provider')
    .action((id: string) => {
      getDatabase();
      removeProvider(Number(id));
      console.log(`Provider ${id} removed.`);
    });
}
