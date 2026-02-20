import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import open from 'open';
import { startTui } from 'sigil-tui';
import { agentManager } from '../../src/agent/AgentManager.js';
import { encryptApiKey } from '../../src/lib/Auth.js';
import { getAuthToken } from '../../src/lib/Config.js';
import { spawnDaemon } from '../../src/lib/Daemon.js';
import { addProvider, getDatabase } from '../../src/lib/Database.js';
import { fetchModelsForProvider } from '../../src/lib/ModelFetcher.js';

export function registerOnboardCommand(program: Command) {
  program
    .command('onboard')
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
      const { models, error } = await fetchModelsForProvider(String(providerName), apiKey ? String(apiKey) : null);
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
      const wantImport = await clack.confirm({
        message: 'Do you want to import an existing Solana wallet using a base58 private key? (Default: No, generate new)',
        initialValue: false,
      });
      if (clack.isCancel(wantImport)) { clack.cancel('Cancelled.'); process.exit(0); }

      let privateKey: string | undefined = undefined;
      if (wantImport) {
        const inputKey = await clack.password({
          message: 'Enter base58 Private Key (hidden):',
          validate: (val) => val.length < 32 ? 'Key seems too short' : undefined,
        });
        if (clack.isCancel(inputKey)) { clack.cancel('Cancelled.'); process.exit(0); }
        privateKey = String(inputKey);
      }

      const inputInterval = await clack.text({
        message: 'Loop interval (seconds):',
        initialValue: '60',
        validate: (val) => isNaN(Number(val)) ? 'Must be a number' : undefined,
      });
      if (clack.isCancel(inputInterval)) { clack.cancel('Cancelled.'); process.exit(0); }
      const loopInterval = String(inputInterval);

      s.start('Creating agent and wallet...');
      const agent = await agentManager.create(agentName, Number(loopInterval) * 1000, privateKey);
      s.stop(`Agent "${agent.name}" created.`);
      clack.log.info(`Wallet: ${agent.pubkey}`);

      // 4. Start Sigil Daemon
      const startDaemonConfirm = await clack.confirm({
        message: 'Onboarding complete! Would you like to start the Sigil backend now?',
        initialValue: true,
      });

      if (clack.isCancel(startDaemonConfirm) || !startDaemonConfirm) {
        clack.outro('Setup complete. Run `sigil start` when you\'re ready. 🚀');
        process.exit(0);
      }

      s.start('Starting background daemon...');
      try {
        await spawnDaemon();
        
        // Wait for token to be generated (daemon needs a second to boot)
        let token: string | undefined;
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          token = getAuthToken();
          if (token) break;
        }

        if (!token) {
          s.stop('Daemon started, but session token not found. Please run `sigil start` manually.');
          clack.outro('Setup finished. Run `sigil dashboard` or `sigil tui` once the daemon is ready.');
          process.exit(0);
        }

        s.stop('Sigil backend is now running in the background.');

        // 5. Interface Selection
        const uiChoice = await clack.select({
          message: 'How would you like to open the interface?',
          options: [
            { value: 'web', label: 'Web UI (Recommended - Modern & Visual)', hint: 'Opens in your default browser' },
            { value: 'tui', label: 'TUI (Terminal Interface)', hint: 'Launches in this terminal' },
          ],
        });

        if (clack.isCancel(uiChoice)) {
          clack.outro('Background process is running. Run `sigil dashboard` or `sigil tui` anytime.');
          process.exit(0);
        }

        if (uiChoice === 'web') {
          clack.log.info('Opening Sigil Dashboard...');
          await open(`http://localhost:7445/#token=${token}`);
          clack.outro('Enjoy your autonomous agent! 🚀');
        } else {
          clack.log.info('Launching Terminal Interface...');
          console.clear();
          const app = startTui(7445, token);
          await app.waitUntilExit();
          clack.outro('Sigil is still running in the background. See you soon!');
        }

      } catch (err) {
        s.stop('Failed to start daemon automatically.');
        clack.log.error(String(err));
        clack.outro('Run `sigil start` manually to launch your agents.');
      }
    });
}
