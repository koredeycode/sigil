import * as clack from '@clack/prompts';
import type { Command } from 'commander';

export function registerProviderCommand(program: Command) {
  const provider = program.command('provider').description('Manage LLM providers');

  provider
    .command('add [name]')
    .option('-k, --key <key>', 'API key')
    .option('-m, --model <model>', 'Model name')
    .description('Add an LLM provider')
    .action(async (name?: string, opts?: { key?: string; model?: string }) => {
      const { getDatabase, addProvider } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);
      const { encryptApiKey } = await import(new URL('../../src/lib/Auth.js', import.meta.url).href);
      
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
          // Try to fetch models dynamically
          const { fetchModelsForProvider } = await import(new URL('../../src/lib/ModelFetcher.js', import.meta.url).href);
          
          const s = clack.spinner();
          s.start(`Fetching available models from ${name}...`);
          const { models, error } = await fetchModelsForProvider(name, opts?.key ?? null);
          s.stop(models ? `Found ${models.length} models` : 'Could not fetch models — enter manually');

          if (error) {
            clack.log.error(error);
          }

          if (models && models.length > 0) {
            const modelOptions = [
              ...models.map(m => ({ value: m.id, label: m.label })),
              { value: '__manual__', label: '✏️  Enter manually...' },
            ];

            const chosen = await clack.select({
              message: 'Select a model:',
              options: modelOptions,
            });
            if (clack.isCancel(chosen)) { clack.cancel('Cancelled.'); process.exit(0); }

            if (String(chosen) === '__manual__') {
              const manual = await clack.text({
                message: 'Model name:',
                validate: (val) => val.length < 1 ? 'Model name cannot be empty' : undefined,
              });
              if (clack.isCancel(manual)) { clack.cancel('Cancelled.'); process.exit(0); }
              opts = { ...opts, model: String(manual) };
            } else {
              opts = { ...opts, model: String(chosen) };
            }
          } else {
            const manual = await clack.text({
              message: 'Model name:',
              placeholder: 'e.g. gpt-4o, llama-3.1-70b-versatile',
              validate: (val) => val.length < 1 ? 'Model name cannot be empty' : undefined,
            });
            if (clack.isCancel(manual)) { clack.cancel('Cancelled.'); process.exit(0); }
            opts = { ...opts, model: String(manual) };
          }
        }
      }

      const encKey = opts?.key ? encryptApiKey(opts.key) : null;
      addProvider(name, encKey, opts?.model ?? 'default', false);
      clack.log.success(`Provider "${name}" added.`);
    });

  provider
    .command('list')
    .description('List all configured providers')
    .action(async () => {
      const { getDatabase, getAllProviders } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);
      
      getDatabase();
      const providers = getAllProviders();
      if (providers.length === 0) {
        clack.log.info('No providers configured. Run `sigil provider add` to add one.');
        return;
      }
      
      clack.log.info('Configured LLM Providers');
      for (const p of providers) {
        const primary = p.is_primary ? ' ⭐ PRIMARY' : '';
        clack.log.step(`[${p.id}] ${p.name} — ${p.model}${primary}`);
      }
    });

  provider
    .command('set-primary [id]')
    .description('Switch the active provider')
    .action(async (id?: string) => {
      const { getDatabase, getAllProviders, setPrimaryProvider } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);
      
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
      const { getDatabase, getAllProviders, removeProvider } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);
      
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

  provider
    .command('models [name]')
    .option('-k, --key <key>', 'API key for the provider')
    .option('-u, --url <url>', 'Base URL for custom/local providers')
    .description('List available models for a provider')
    .action(async (name?: string, opts?: { key?: string; url?: string }) => {
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);
      
      getDatabase();

      if (!name) {
        clack.intro('Fetch available models');

        const selected = await clack.select({
          message: 'Which provider?',
          options: [
            { value: 'groq', label: 'Groq' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'google', label: 'Google (Gemini)' },
            { value: 'ollama', label: 'Ollama (Local)' },
            { value: 'lmstudio', label: 'LM Studio (Local)' },
          ],
        });
        if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
        name = String(selected);
      }

      const needsKey = !['ollama', 'lmstudio'].includes(name);
      if (needsKey && !opts?.key) {
        const key = await clack.password({ message: `Enter your ${name} API key:` });
        if (clack.isCancel(key)) { clack.cancel('Cancelled.'); process.exit(0); }
        opts = { ...opts, key: String(key) };
      }

      const { fetchModelsForProvider } = await import(new URL('../../src/lib/ModelFetcher.js', import.meta.url).href);
      
      const s = clack.spinner();
      s.start(`Fetching models from ${name}...`);
      const { models, error } = await fetchModelsForProvider(name, opts?.key ?? null, opts?.url);
      s.stop(models ? `Found ${models.length} model(s)` : 'Failed to fetch models');

      if (error) {
        clack.log.error(error);
        process.exit(1);
      }

      if (!models || models.length === 0) {
        clack.log.warning('No models found for this provider.');
        process.exit(0);
      }

      clack.log.message('');
      for (const m of models) {
        clack.log.message(`  ${m.id}${m.label !== m.id ? ` — ${m.label}` : ''}`);
      }
      clack.log.message(`\n  Total: ${models.length} models`);
    });
}
