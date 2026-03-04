import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import open from 'open';

export function registerOnboardCommand(program: Command) {
  program
    .command('onboard')
    .description('Guided onboarding wizard — set up your first agent and provider')
    .action(async () => {
      // 1. LLM Provider setup (with retry on failure)
      let providerName: string | symbol = '';
      let apiKey: string | symbol | null = null;
      let baseUrl: string | null = null;
      let compat: string = 'openai';
      let model: string | symbol = '';
      let providerReady = false;

      while (!providerReady) {
        providerName = await clack.select({
          message: 'Which LLM provider would you like to use?',
          options: [
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'google', label: 'Google' },
            { value: 'groq', label: 'Groq' },
            { value: 'custom', label: 'Custom Provider' },
          ],
        });

        if (clack.isCancel(providerName)) { clack.cancel('Setup cancelled.'); process.exit(0); }

        const isCustom = String(providerName) === 'custom';
        apiKey = null;
        baseUrl = null;
        compat = 'openai';
        model = '';

        if (isCustom) {
          // Custom provider flow
          const customName = await clack.text({
            message: 'Provider name:',
            placeholder: 'e.g. ollama, lmstudio, my-server',
            validate: (val) => val.length < 1 ? 'Name cannot be empty' : undefined,
          });
          if (clack.isCancel(customName)) { clack.cancel('Setup cancelled.'); process.exit(0); }
          providerName = String(customName);

          const inputBaseUrl = await clack.text({
            message: 'API Base URL:',
            initialValue: 'http://localhost:11434/v1',
            validate: (val) => val.length < 1 ? 'Base URL cannot be empty' : undefined,
          });
          if (clack.isCancel(inputBaseUrl)) { clack.cancel('Setup cancelled.'); process.exit(0); }
          baseUrl = String(inputBaseUrl);

          const inputApiKey = await clack.text({
            message: 'API Key (leave blank if not required):',
            initialValue: '',
          });
          if (clack.isCancel(inputApiKey)) { clack.cancel('Setup cancelled.'); process.exit(0); }
          apiKey = String(inputApiKey) || null;

          const compatChoice = await clack.select({
            message: 'Endpoint compatibility:',
            options: [
              { value: 'openai', label: 'OpenAI-compatible', hint: 'Most providers (Ollama, LM Studio, vLLM, etc.)' },
              { value: 'anthropic', label: 'Anthropic-compatible' },
            ],
          });
          if (clack.isCancel(compatChoice)) { clack.cancel('Setup cancelled.'); process.exit(0); }
          compat = String(compatChoice);

          model = await clack.text({
            message: 'Model ID:',
            placeholder: 'e.g. llama3, mistral, gpt-4o',
            validate: (val) => val.length < 1 ? 'Model ID cannot be empty' : undefined,
          });
          if (clack.isCancel(model)) { clack.cancel('Setup cancelled.'); process.exit(0); }

          providerReady = true;
        } else {
          // Standard provider flow
          apiKey = await clack.password({
            message: `Enter your ${String(providerName)} API key:`,
          });
          if (clack.isCancel(apiKey)) { clack.cancel('Setup cancelled.'); process.exit(0); }

          // Fetch models dynamically
          const s2 = clack.spinner();
          s2.start(`Fetching available models from ${String(providerName)}...`);
          
          const { fetchModelsForProvider } = await import('../../src/lib/ModelFetcher.js');
          const { models, error } = await fetchModelsForProvider(String(providerName), apiKey ? String(apiKey) : null);
          s2.stop(models ? `Found ${models.length} models` : 'Failed to fetch models');

          if (error) {
            clack.log.error(error);
            const retry = await clack.confirm({
              message: 'Would you like to try a different provider or API key?',
              initialValue: true,
            });
            if (clack.isCancel(retry) || retry) {
              continue; // restart the loop
            }
            // User chose not to retry — exit
            clack.cancel('Setup cancelled.');
            process.exit(0);
          }

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
          }

          if (clack.isCancel(model)) { clack.cancel('Setup cancelled.'); process.exit(0); }

          providerReady = true;
        }
      }

      const { agentManager } = await import('../../src/agent/AgentManager.js');
      const { encryptApiKey } = await import('../../src/lib/Auth.js');
      const { getAuthToken } = await import('../../src/lib/Config.js');
      const { spawnDaemon } = await import('../../src/lib/Daemon.js');
      const { addProvider, getDatabase } = await import('../../src/lib/Database.js');

      // Initialize DB
      getDatabase();

      const s = clack.spinner();

      // Store provider
      const encKey = apiKey ? encryptApiKey(String(apiKey)) : null;
      addProvider(String(providerName), encKey, String(model), true, baseUrl, compat);

      clack.log.success(`Provider "${providerName}" added as primary`);

      // 2. Initialize main agent
      const createFirst = await clack.confirm({
        message: 'Initialize the main Sigil agent now?',
      });

      if (clack.isCancel(createFirst) || !createFirst) {
        clack.log.info('You can initialize the main agent later by running `sigil agent init`.');
      } else {
        s.start('Initializing main agent and wallet...');
        const agent = await agentManager.initMainAgent();
        await agentManager.start(agent.id);
        s.stop(`Main agent "${agent.name}" initialized.`);
        clack.log.info(`Wallet: ${agent.pubkey}`);
      }

      // 4. Start Sigil Daemon
      clack.log.info('Onboarding complete! Starting Sigil now...');

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
          const { startTui } = await import('sigil-tui');
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
