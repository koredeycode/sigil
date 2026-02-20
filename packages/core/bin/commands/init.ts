import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { encryptApiKey } from '../../src/lib/Auth.js';
import { addProvider, getDatabase } from '../../src/lib/Database.js';
import { fetchModels } from '../../src/lib/ModelFetcher.js';

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Guided onboarding wizard — set up your first agent and provider')
    .action(async () => {
      // 1. LLM Provider
      const providerName = await clack.select({
        message: 'Which LLM provider would you like to use?',
        options: [
          { value: 'groq', label: 'Groq (Fastest inference)' },
          { value: 'openai', label: 'OpenAI (GPT-4o)' },
          { value: 'anthropic', label: 'Anthropic (Claude)' },
          { value: 'google', label: 'Google (Gemini)' },
          { value: 'ollama', label: 'Ollama (Local)' },
          { value: 'lmstudio', label: 'LM Studio (Local)' },
        ],
      });

      if (clack.isCancel(providerName)) { clack.cancel('Setup cancelled.'); process.exit(0); }

      let apiKey: string | symbol | null = null;
      const needsKey = !['ollama', 'lmstudio'].includes(String(providerName));

      if (needsKey) {
        apiKey = await clack.password({
          message: `Enter your ${String(providerName)} API key:`,
        });
        if (clack.isCancel(apiKey)) { clack.cancel('Setup cancelled.'); process.exit(0); }
      }

      // Model selection options per provider
      // Fetch models dynamically
      const s = clack.spinner();
      s.start(`Fetching available models from ${String(providerName)}...`);
      const { models, error } = await fetchModels(String(providerName), apiKey ? String(apiKey) : null);
      s.stop(models ? `Found ${models.length} models` : 'Could not fetch models — enter manually');

      if (error) {
        clack.log.error(error);
      }

      let model: string | symbol = '';

      if (models && models.length > 0) {
        const modelOptions = [
          ...models.map(m => ({ value: m.id, label: m.label })),
          { value: '__manual__', label: '✏️  Enter manually...' },
        ];

        model = await clack.select({
          message: 'Which model?',
          options: modelOptions,
        });

        if (String(model) === '__manual__') {
          model = await clack.text({
            message: 'Enter model name manually:',
            validate: (val) => val.length < 1 ? 'Model name cannot be empty' : undefined,
          });
        }
      } else {
        model = await clack.text({
          message: 'Which model?',
          initialValue: '',
          placeholder: 'e.g. gpt-4o',
          validate: (val) => val.length < 1 ? 'Model name cannot be empty' : undefined,
        });
      }

      if (clack.isCancel(model)) { clack.cancel('Setup cancelled.'); process.exit(0); }

      // Initialize DB
      getDatabase();

      // Store provider
      const encKey = apiKey ? encryptApiKey(String(apiKey)) : null;
      addProvider(String(providerName), encKey, String(model), true);

      clack.log.success(`Provider "${providerName}" added as primary`);

      // 2. Create first agent
      const createFirst = await clack.confirm({
        message: 'Create your first agent?',
      });

      if (clack.isCancel(createFirst) || !createFirst) {
        clack.outro('Run `sigil agent create <name>` when you\'re ready.');
        process.exit(0);
      }

      const agentName = await clack.text({
        message: 'Name your agent:',
        initialValue: 'treasury',
        validate: (val) => val.length < 1 ? 'Name cannot be empty' : undefined,
      });
      if (clack.isCancel(agentName)) { clack.cancel('Setup cancelled.'); process.exit(0); }

      // 3. Loop interval
      const interval = await clack.text({
        message: 'Agent loop interval (seconds):',
        initialValue: '60',
        validate: (val) => isNaN(Number(val)) ? 'Must be a number' : undefined,
      });
      if (clack.isCancel(interval)) { clack.cancel('Setup cancelled.'); process.exit(0); }

      const agent = await agentManager.create(String(agentName), Number(interval) * 1000);

      clack.log.success(`Agent "${agentName}" created`);
      clack.log.info(`Wallet: ${agent.pubkey}`);

      clack.outro('Run `sigil start` to launch your agents. Happy building! 🚀');
    });
}
