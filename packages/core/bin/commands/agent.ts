import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { getDatabase } from '../../src/lib/Database.js';

export function registerAgentCommand(program: Command) {
  const agent = program.command('agent').description('Manage the Sigil agent');

  // sigil agent init — initialize (or show) the main agent
  agent
    .command('init')
    .option('-k, --key <privateKey>', 'Import an existing wallet via base58 private key')
    .description('Initialize the main Sigil agent with a new or imported wallet')
    .action(async (opts?: { key?: string }) => {
      getDatabase();

      const existing = agentManager.getMainAgent();
      if (existing) {
        console.log(`\n  ⎔ Main agent already initialized.`);
        console.log(`  Name:   ${existing.name}`);
        console.log(`  Wallet: ${existing.pubkey}`);
        console.log(`  Status: ${existing.status}\n`);
        return;
      }

      let privateKey: string | undefined = opts?.key;

      if (!privateKey) {
        const wantImport = await clack.confirm({
          message: 'Import an existing Solana wallet? (Default: generate new)',
          initialValue: false,
        });
        if (clack.isCancel(wantImport)) { clack.cancel('Cancelled.'); process.exit(0); }

        if (wantImport) {
          const inputKey = await clack.password({
            message: 'Enter base58 Private Key (hidden):',
            validate: (val) => val.length < 32 ? 'Key seems too short' : undefined,
          });
          if (clack.isCancel(inputKey)) { clack.cancel('Cancelled.'); process.exit(0); }
          privateKey = String(inputKey);
        }
      }

      const a = await agentManager.initMainAgent(privateKey);
      clack.log.success(`Main agent initialized. Wallet: ${a.pubkey}`);
    });

  // sigil agent info — show agent details
  agent
    .command('info')
    .description('Show the main agent details')
    .action(() => {
      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) {
        console.log('  Agent not initialized. Run `sigil agent init` first.');
        return;
      }
      console.log(`\n  ⎔ Sigil Agent\n`);
      console.log(`  Name:     ${a.name}`);
      console.log(`  ID:       ${a.id}`);
      console.log(`  Wallet:   ${a.pubkey}`);
      console.log(`  Status:   ${a.status}`);
      console.log(`  Interval: ${a.loop_interval / 1000}s`);
      console.log(`  Created:  ${a.created_at}\n`);
    });

  // sigil agent start — resume the agent
  agent
    .command('start')
    .description('Start the main agent')
    .action(async () => {
      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) { console.log('  Agent not initialized. Run `sigil agent init` first.'); return; }
      await agentManager.start();
      clack.log.success(`Agent "${a.name}" started.`);
    });

  // sigil agent pause — pause the agent
  agent
    .command('pause')
    .description('Pause the main agent')
    .action(() => {
      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) { console.log('  Agent not initialized.'); return; }
      agentManager.pause();
      clack.log.success(`Agent "${a.name}" paused.`);
    });

  // sigil agent reset — destroy and reinitialize
  agent
    .command('reset')
    .description('Destroy the main agent and optionally reinitialize')
    .action(async () => {
      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) {
        console.log('  No agent to reset. Run `sigil agent init` to create one.');
        return;
      }

      const confirmed = await clack.confirm({
        message: `This will destroy agent "${a.name}" and all its data. Continue?`,
      });
      if (clack.isCancel(confirmed) || !confirmed) {
        clack.cancel('Cancelled.');
        return;
      }

      await agentManager.destroy(a.id);
      clack.log.success('Agent destroyed.');

      const reinit = await clack.confirm({
        message: 'Reinitialize a fresh agent now?',
        initialValue: true,
      });
      if (clack.isCancel(reinit) || !reinit) return;

      const newAgent = await agentManager.initMainAgent();
      clack.log.success(`Fresh agent initialized. Wallet: ${newAgent.pubkey}`);
    });
}
