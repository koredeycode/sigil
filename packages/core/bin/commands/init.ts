import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { encryptApiKey } from '../../src/lib/Auth.js';
import { addProvider, getDatabase } from '../../src/lib/Database.js';

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
      const modelOptions: Record<string, { value: string; label: string }[]> = {
        groq: [
          { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (Versatile)' },
          { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Instant)' },
          { value: 'llama3-70b-8192', label: 'Llama 3 70B' },
          { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
          { value: 'gemma-7b-it', label: 'Gemma 7B' },
        ],
        openai: [
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        ],
        anthropic: [
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
        ],
        google: [
          { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
          { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        ],
        ollama: [
          { value: 'llama3', label: 'Llama 3' },
          { value: 'mistral', label: 'Mistral' },
          { value: 'gemma', label: 'Gemma' },
          { value: 'codellama', label: 'CodeLlama' },
          { value: 'manual', label: 'Enter manually...' },
        ],
        lmstudio: [
          { value: 'default', label: 'Default (Loaded Model)' },
          { value: 'manual', label: 'Enter manually...' },
        ],
      };

      const options = modelOptions[String(providerName)] || [];
      let model: string | symbol = '';

      if (options.length > 0) {
        model = await clack.select({
          message: 'Which model?',
          options: options,
        });
        
        if (model === 'manual') {
            model = await clack.text({
                message: 'Enter model name manually:',
                validate: (val) => val.length < 1 ? 'Model name cannot be empty' : undefined,
            });
        }
      } else {
        model = await clack.text({
          message: 'Which model?',
          initialValue: '',
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
