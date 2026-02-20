import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { runCycle } from '../../src/agent/AgentLoop.js';
import { agentManager } from '../../src/agent/AgentManager.js';
import { getDatabase } from '../../src/lib/Database.js';

/** Helper: prompt user to pick an agent from the list. Returns agent name or exits. */
async function selectAgent(filter?: (a: any) => boolean): Promise<string> {
  const agents = agentManager.list();
  const filtered = filter ? agents.filter(filter) : agents;

  if (filtered.length === 0) {
    clack.log.warning('No agents found. Run `sigil agent create` to create one.');
    process.exit(0);
  }

  const selected = await clack.select({
    message: 'Select an agent:',
    options: filtered.map(a => ({
      value: a.name,
      label: `${a.status === 'running' ? '🟢' : a.status === 'paused' ? '🟡' : '🔴'} ${a.name}`,
      hint: `${a.status} — ${a.pubkey.slice(0, 8)}...`,
    })),
  });

  if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
  return String(selected);
}

export function registerAgentCommand(program: Command) {
  const agent = program.command('agent').description('Manage agents');

  agent
    .command('create [name]')
    .option('-i, --interval <seconds>', 'Loop interval in seconds', '60')
    .description('Create a new agent with its own wallet')
    .action(async (name?: string, opts?: { interval: string }) => {
      getDatabase();

      if (!name) {
        clack.intro('Create a new agent');

        const inputName = await clack.text({
          message: 'Name your agent:',
          placeholder: 'e.g. treasury',
          validate: (val) => val.length < 1 ? 'Name cannot be empty' : undefined,
        });
        if (clack.isCancel(inputName)) { clack.cancel('Cancelled.'); process.exit(0); }
        name = String(inputName);

        const inputInterval = await clack.text({
          message: 'Loop interval (seconds):',
          initialValue: '60',
          validate: (val) => isNaN(Number(val)) ? 'Must be a number' : undefined,
        });
        if (clack.isCancel(inputInterval)) { clack.cancel('Cancelled.'); process.exit(0); }
        opts = { interval: String(inputInterval) };
      }

      const a = await agentManager.create(name, Number(opts!.interval) * 1000);
      clack.log.success(`Agent "${name}" created. Wallet: ${a.pubkey}`);
    });

  agent
    .command('list')
    .description('List all agents with status and wallet addresses')
    .action(() => {
      getDatabase();
      const agents = agentManager.list();
      if (agents.length === 0) {
        console.log('No agents found. Run `sigil agent create` to create one.');
        return;
      }
      for (const a of agents) {
        const icon = a.status === 'running' ? '🟢' : a.status === 'paused' ? '🟡' : '🔴';
        console.log(`${icon} ${a.name}  ${a.status}  ${a.pubkey}`);
      }
    });

  agent
    .command('start [name]')
    .description('Start a specific agent\'s loop')
    .action(async (name?: string) => {
      getDatabase();
      if (!name) name = await selectAgent((a) => a.status !== 'running');
      agentManager.setCycleRunner(runCycle);
      await agentManager.start(name);
      clack.log.success(`Agent "${name}" started.`);
    });

  agent
    .command('pause [name]')
    .description('Pause an agent (loop stops, wallet persists)')
    .action(async (name?: string) => {
      getDatabase();
      if (!name) name = await selectAgent((a) => a.status === 'running');
      agentManager.pause(name);
      clack.log.success(`Agent "${name}" paused.`);
    });

  agent
    .command('destroy [name]')
    .description('Remove an agent and its data')
    .action(async (name?: string) => {
      getDatabase();
      if (!name) name = await selectAgent();

      const confirmed = await clack.confirm({
        message: `Are you sure you want to destroy agent "${name}"? This cannot be undone.`,
      });
      if (clack.isCancel(confirmed) || !confirmed) {
        clack.cancel('Cancelled.');
        return;
      }

      await agentManager.destroy(name);
      clack.log.success(`Agent "${name}" destroyed.`);
    });

  agent
    .command('info [name]')
    .description('Show agent details')
    .action(async (name?: string) => {
      getDatabase();
      if (!name) name = await selectAgent();
      const a = agentManager.get(name);
      if (!a) { console.log(`Agent "${name}" not found.`); return; }
      console.log(`Name:     ${a.name}`);
      console.log(`ID:       ${a.id}`);
      console.log(`Wallet:   ${a.pubkey}`);
      console.log(`Status:   ${a.status}`);
      console.log(`Interval: ${a.loop_interval / 1000}s`);
      console.log(`Created:  ${a.created_at}`);
    });
}
