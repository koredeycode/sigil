import type { Command } from 'commander';
import { runCycle } from '../../src/agent/AgentLoop.js';
import { agentManager } from '../../src/agent/AgentManager.js';
import { getDatabase } from '../../src/lib/Database.js';

export function registerAgentCommand(program: Command) {
  const agent = program.command('agent').description('Manage agents');

  agent
    .command('create <name>')
    .option('-i, --interval <seconds>', 'Loop interval in seconds', '60')
    .description('Create a new agent with its own wallet')
    .action(async (name: string, opts: { interval: string }) => {
      getDatabase();
      const a = await agentManager.create(name, Number(opts.interval) * 1000);
      console.log(`Agent "${name}" created. Wallet: ${a.pubkey}`);
    });

  agent
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

  agent
    .command('start <name>')
    .description('Start a specific agent\'s loop')
    .action(async (name: string) => {
      getDatabase();
      agentManager.setCycleRunner(runCycle);
      await agentManager.start(name);
      console.log(`Agent "${name}" started.`);
    });

  agent
    .command('pause <name>')
    .description('Pause an agent (loop stops, wallet persists)')
    .action((name: string) => {
      getDatabase();
      agentManager.pause(name);
      console.log(`Agent "${name}" paused.`);
    });

  agent
    .command('destroy <name>')
    .description('Remove an agent and its data')
    .action(async (name: string) => {
      getDatabase();
      await agentManager.destroy(name);
      console.log(`Agent "${name}" destroyed.`);
    });

  agent
    .command('info <name>')
    .description('Show agent details')
    .action((name: string) => {
      getDatabase();
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
