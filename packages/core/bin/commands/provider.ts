import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { encryptApiKey } from '../../src/lib/Auth.js';
import { addProvider, getAllProviders, getDatabase, removeProvider, setPrimaryProvider } from '../../src/lib/Database.js';

export function registerProviderCommand(program: Command) {
  const provider = program.command('provider').description('Manage LLM providers');

  provider
    .command('add [name]')
    .option('-k, --key <key>', 'API key')
    .option('-m, --model <model>', 'Model name')
    .description('Add an LLM provider')
    .action(async (name?: string, opts?: { key?: string; model?: string }) => {
      getDatabase();

      if (!name) {
        clack.intro('Add a new LLM provider');

        const selected = await clack.select({
          message: 'Which provider?',
          options: [
            { value: 'groq', label: 'Groq (Fastest inference)' },
            { value: 'openai', label: 'OpenAI (GPT-4o)' },
            { value: 'anthropic', label: 'Anthropic (Claude)' },
            { value: 'google', label: 'Google (Gemini)' },
            { value: 'ollama', label: 'Ollama (Local)' },
            { value: 'lmstudio', label: 'LM Studio (Local)' },
          ],
        });
        if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
        name = String(selected);

        const needsKey = !['ollama', 'lmstudio'].includes(name);
        if (needsKey && !opts?.key) {
          const key = await clack.password({ message: `Enter your ${name} API key:` });
          if (clack.isCancel(key)) { clack.cancel('Cancelled.'); process.exit(0); }
          opts = { ...opts, key: String(key) };
        }

        if (!opts?.model) {
          const model = await clack.text({
            message: 'Model name:',
            placeholder: 'e.g. gpt-4o, llama-3.1-70b-versatile',
            validate: (val) => val.length < 1 ? 'Model name cannot be empty' : undefined,
          });
          if (clack.isCancel(model)) { clack.cancel('Cancelled.'); process.exit(0); }
          opts = { ...opts, model: String(model) };
        }
      }

      const encKey = opts?.key ? encryptApiKey(opts.key) : null;
      addProvider(name, encKey, opts?.model ?? 'default', false);
      clack.log.success(`Provider "${name}" added.`);
    });

  provider
    .command('list')
    .description('List all configured providers')
    .action(() => {
      getDatabase();
      const providers = getAllProviders();
      if (providers.length === 0) {
        console.log('No providers configured. Run `sigil provider add` to add one.');
        return;
      }
      for (const p of providers) {
        const primary = p.is_primary ? ' ⭐ PRIMARY' : '';
        console.log(`[${p.id}] ${p.name} — ${p.model}${primary}`);
      }
    });

  provider
    .command('set-primary [id]')
    .description('Switch the active provider')
    .action(async (id?: string) => {
      getDatabase();

      if (!id) {
        const providers = getAllProviders();
        if (providers.length === 0) {
          clack.log.warning('No providers found.');
          process.exit(0);
        }

        const selected = await clack.select({
          message: 'Which provider should be primary?',
          options: providers.map(p => ({
            value: String(p.id),
            label: `${p.name} — ${p.model}`,
            hint: p.is_primary ? 'current primary' : undefined,
          })),
        });
        if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
        id = String(selected);
      }

      setPrimaryProvider(Number(id));
      clack.log.success(`Provider ${id} set as primary.`);
    });

  provider
    .command('remove [id]')
    .description('Remove a provider')
    .action(async (id?: string) => {
      getDatabase();

      if (!id) {
        const providers = getAllProviders();
        if (providers.length === 0) {
          clack.log.warning('No providers found.');
          process.exit(0);
        }

        const selected = await clack.select({
          message: 'Which provider to remove?',
          options: providers.map(p => ({
            value: String(p.id),
            label: `${p.name} — ${p.model}`,
            hint: p.is_primary ? '⭐ primary' : undefined,
          })),
        });
        if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
        id = String(selected);
      }

      const confirmed = await clack.confirm({
        message: `Remove provider ${id}? This cannot be undone.`,
      });
      if (clack.isCancel(confirmed) || !confirmed) {
        clack.cancel('Cancelled.');
        return;
      }

      removeProvider(Number(id));
      clack.log.success(`Provider ${id} removed.`);
    });
}
