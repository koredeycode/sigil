#!/usr/bin/env node

import * as clack from '@clack/prompts';
import { Command } from 'commander';
import { runCycle } from '../src/agent/AgentLoop.js';
import { agentManager } from '../src/agent/AgentManager.js';
import { createSessionToken, encryptApiKey } from '../src/lib/Auth.js';
import { setKillSwitch } from '../src/lib/Config.js';
import { addDirective, addProvider, deleteDirective, getAgentLogs, getAgentTransactions, getAllDirectivesForAgent, getAllProviders, getDatabase, removeProvider, setPrimaryProvider } from '../src/lib/Database.js';
import { startServer } from '../src/server/app.js';

const program = new Command();

program
  .name('sigil')
  .description('The Local-First Autonomous Agent for Solana')
  .version('0.1.0');

// ─── sigil init ────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Guided onboarding wizard — set up your first agent and provider')
  .action(async () => {
    clack.intro('⎔ Welcome to Sigil');

    // 1. LLM Provider
    const providerName = await clack.select({
      message: 'Which LLM provider would you like to use?',
      options: [
        { value: 'groq', label: 'Groq (Fastest inference)' },
        { value: 'openai', label: 'OpenAI (GPT-4o)' },
        { value: 'anthropic', label: 'Anthropic (Claude)' },
        { value: 'google', label: 'Google (Gemini)' },
        { value: 'ollama', label: 'Ollama (Local, no API key)' },
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

    const modelDefaults: Record<string, string> = {
      groq: 'llama-3.1-70b-versatile',
      openai: 'gpt-4o',
      anthropic: 'claude-3-5-sonnet-20241022',
      google: 'gemini-1.5-pro',
      ollama: 'llama3',
      lmstudio: 'default',
    };

    const model = await clack.text({
      message: 'Which model?',
      initialValue: modelDefaults[String(providerName)] ?? '',
    });
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

// ─── sigil start ───────────────────────────────────────────────────────────
program
  .command('start')
  .description('Boot the API server and start all active agent loops')
  .action(async () => {
    console.log('\n  ⎔ Sigil — Starting...\n');

    getDatabase();
    const token = createSessionToken();

    // Wire up the cycle runner
    agentManager.setCycleRunner(runCycle);

    // Start the API server
    await startServer();

    // Start all non-killed agents
    await agentManager.startAll();

    const agents = agentManager.list();
    console.log(`  Session Token: ${token}`);
    console.log(`  Agents: ${agents.length} loaded\n`);
  });

// ─── sigil kill ────────────────────────────────────────────────────────────
program
  .command('kill [agent]')
  .description('Activate kill switch — stops all agents or a specific one')
  .action((_agent?: string) => {
    getDatabase();
    if (_agent) {
      agentManager.kill(_agent);
      console.log(`Agent "${_agent}" killed. Key wiped from memory.`);
    } else {
      setKillSwitch(true);
      agentManager.killAll();
      console.log('Global kill switch activated. All agents halted.');
    }
  });

// ─── sigil agent ───────────────────────────────────────────────────────────
const agentCmd = program.command('agent').description('Manage agents');

agentCmd
  .command('create <name>')
  .option('-i, --interval <seconds>', 'Loop interval in seconds', '60')
  .description('Create a new agent with its own wallet')
  .action(async (name: string, opts: { interval: string }) => {
    getDatabase();
    const agent = await agentManager.create(name, Number(opts.interval) * 1000);
    console.log(`Agent "${name}" created. Wallet: ${agent.pubkey}`);
  });

agentCmd
  .command('list')
  .description('List all agents with status and wallet addresses')
  .action(() => {
    getDatabase();
    const agents = agentManager.list();
    if (agents.length === 0) {
      console.log('No agents found. Run `sigil agent create <name>` to create one.');
      return;
    }
    for (const a of agents) {
      const icon = a.status === 'running' ? '🟢' : a.status === 'paused' ? '🟡' : '🔴';
      console.log(`${icon} ${a.name}  ${a.status}  ${a.pubkey}`);
    }
  });

agentCmd
  .command('start <name>')
  .description('Start a specific agent\'s loop')
  .action(async (name: string) => {
    getDatabase();
    agentManager.setCycleRunner(runCycle);
    await agentManager.start(name);
    console.log(`Agent "${name}" started.`);
  });

agentCmd
  .command('pause <name>')
  .description('Pause an agent (loop stops, wallet persists)')
  .action((name: string) => {
    getDatabase();
    agentManager.pause(name);
    console.log(`Agent "${name}" paused.`);
  });

agentCmd
  .command('destroy <name>')
  .description('Remove an agent and its data')
  .action(async (name: string) => {
    getDatabase();
    await agentManager.destroy(name);
    console.log(`Agent "${name}" destroyed.`);
  });

agentCmd
  .command('info <name>')
  .description('Show agent details')
  .action((name: string) => {
    getDatabase();
    const agent = agentManager.get(name);
    if (!agent) { console.log(`Agent "${name}" not found.`); return; }
    console.log(`Name:     ${agent.name}`);
    console.log(`ID:       ${agent.id}`);
    console.log(`Wallet:   ${agent.pubkey}`);
    console.log(`Status:   ${agent.status}`);
    console.log(`Interval: ${agent.loop_interval / 1000}s`);
    console.log(`Created:  ${agent.created_at}`);
  });

// ─── sigil directive ───────────────────────────────────────────────────────
const directiveCmd = program.command('directive').description('Manage directives');

directiveCmd
  .command('add <agent> <text>')
  .description('Add a directive to an agent')
  .action((agent: string, text: string) => {
    getDatabase();
    const a = agentManager.get(agent);
    if (!a) { console.log(`Agent "${agent}" not found.`); return; }
    addDirective(a.id, text, text, undefined, 60);
    console.log(`Directive added to "${agent}": ${text}`);
  });

directiveCmd
  .command('list <agent>')
  .description('View an agent\'s directives')
  .action((agent: string) => {
    getDatabase();
    const a = agentManager.get(agent);
    if (!a) { console.log(`Agent "${agent}" not found.`); return; }
    const directives = getAllDirectivesForAgent(a.id);
    if (directives.length === 0) { console.log('No directives.'); return; }
    for (const d of directives) {
      const icon = d.is_active ? '✅' : '❌';
      console.log(`${icon} [${d.id}] ${d.condition} → ${d.action}`);
    }
  });

directiveCmd
  .command('remove <id>')
  .description('Remove a directive by ID')
  .action((id: string) => {
    getDatabase();
    deleteDirective(Number(id));
    console.log(`Directive ${id} removed.`);
  });

// ─── sigil provider ────────────────────────────────────────────────────────
const providerCmd = program.command('provider').description('Manage LLM providers');

providerCmd
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

providerCmd
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

providerCmd
  .command('set-primary <id>')
  .description('Switch the active provider')
  .action((id: string) => {
    getDatabase();
    setPrimaryProvider(Number(id));
    console.log(`Provider ${id} set as primary.`);
  });

providerCmd
  .command('remove <id>')
  .description('Remove a provider')
  .action((id: string) => {
    getDatabase();
    removeProvider(Number(id));
    console.log(`Provider ${id} removed.`);
  });

// ─── sigil chat ────────────────────────────────────────────────────────────
program
  .command('chat <agent> <message>')
  .description('Chat with a specific agent')
  .action(async (agent: string, message: string) => {
    getDatabase();
    const a = agentManager.get(agent);
    if (!a) { console.log(`Agent "${agent}" not found.`); return; }
    console.log(`You: ${message}`);
    console.log('Agent is thinking...');
    // In headless mode, we'd need the server running. For now, print a note.
    console.log('(Start the server with `sigil start` first, then use chat via API or TUI)');
  });

// ─── sigil logs ────────────────────────────────────────────────────────────
program
  .command('logs <agent>')
  .option('-n, --tail <count>', 'Number of log entries', '20')
  .description('View an agent\'s recent activity')
  .action((agent: string, opts: { tail: string }) => {
    getDatabase();
    const a = agentManager.get(agent);
    if (!a) { console.log(`Agent "${agent}" not found.`); return; }
    const logs = getAgentLogs(a.id, Number(opts.tail));
    if (logs.length === 0) { console.log('No logs yet.'); return; }
    for (const log of logs.reverse()) {
      console.log(`[${log.timestamp}] ${log.action}: ${log.result ?? ''}`);
    }
  });

// ─── sigil tx ──────────────────────────────────────────────────────────────
program
  .command('tx <agent>')
  .option('-n, --limit <count>', 'Number of transactions', '20')
  .description('View an agent\'s transactions')
  .action((agent: string, opts: { limit: string }) => {
    getDatabase();
    const a = agentManager.get(agent);
    if (!a) { console.log(`Agent "${agent}" not found.`); return; }
    const txs = getAgentTransactions(a.id, Number(opts.limit));
    if (txs.length === 0) { console.log('No transactions yet.'); return; }
    for (const tx of txs.reverse()) {
      const sig = tx.signature ? tx.signature.slice(0, 16) + '...' : '(pending)';
      console.log(`[${tx.timestamp}] ${tx.type} ${tx.amount ?? ''} ${tx.token ?? ''} → ${tx.status} | ${sig}`);
    }
  });

// ─── sigil auth ────────────────────────────────────────────────────────────
program
  .command('auth')
  .description('Auth management')
  .command('rotate')
  .description('Rotate the session token')
  .action(() => {
    getDatabase();
    const token = createSessionToken();
    console.log(`New session token: ${token}`);
  });

program.parse();
