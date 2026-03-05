import * as clack from '@clack/prompts';
import type { Command } from 'commander';

export function registerAgentCommand(program: Command) {
  const agent = program.command('agent').description('Manage the Sigil Wallet agent');

  // sigil agent init — initialize (or show) the main agent
  agent
    .command('init')
    .option('-k, --key <privateKey>', 'Import an existing wallet via base58 private key')
    .description('Initialize the main Sigil agent with a new or imported wallet')
    .action(async (opts?: { key?: string }) => {
      const { agentManager } = await import('../../src/agent/AgentManager.js');
      const { getDatabase } = await import('../../src/lib/Database.js');
      
      getDatabase();

      const existing = agentManager.getMainAgent();
      if (existing) {
        clack.log.info(`Main agent already initialized.`);
        clack.log.step(`Name:   ${existing.name}`);
        clack.log.step(`Wallet: ${existing.pubkey}`);
        clack.log.step(`Status: ${existing.status}`);
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

      const s = clack.spinner();
      s.start('Initializing agent and persisting wallet...');
      const a = await agentManager.initMainAgent(privateKey);
      s.stop(`Main agent initialized. Wallet: ${a.pubkey}`);
    });

  // sigil agent info — show agent details
  agent
    .command('info')
    .description('Show the main agent details')
    .action(async () => {
      const { agentManager } = await import('../../src/agent/AgentManager.js');
      const { getDatabase } = await import('../../src/lib/Database.js');
      
      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) {
        clack.log.warn('Agent not initialized. Run `sigil agent init` first.');
        return;
      }
      clack.log.info(`Sigil Agent: ${a.name}`);
      clack.log.step(`ID:       ${a.id}`);
      clack.log.step(`Wallet:   ${a.pubkey}`);
      clack.log.step(`Status:   ${a.status}`);
      clack.log.step(`Interval: ${a.loop_interval / 1000}s`);
      clack.log.step(`Created:  ${a.created_at}`);
    });

  // sigil agent start — resume the agent
  agent
    .command('start')
    .description('Start the main agent')
    .action(async () => {
      const { agentManager } = await import('../../src/agent/AgentManager.js');
      const { getDatabase } = await import('../../src/lib/Database.js');
      
      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) { clack.log.warn('Agent not initialized. Run `sigil agent init` first.'); return; }
      await agentManager.start();
      clack.log.success(`Agent "${a.name}" started.`);
    });

  // sigil agent pause — pause the agent
  agent
    .command('pause')
    .description('Pause the main agent')
    .action(async () => {
      const { agentManager } = await import('../../src/agent/AgentManager.js');
      const { getDatabase } = await import('../../src/lib/Database.js');
      
      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) { clack.log.warn('Agent not initialized.'); return; }
      agentManager.pause();
      clack.log.success(`Agent "${a.name}" paused.`);
    });

  // sigil agent reset — destroy and reinitialize
  agent
    .command('reset')
    .description('Destroy the main agent and optionally reinitialize')
    .action(async () => {
      const { agentManager } = await import('../../src/agent/AgentManager.js');
      const { getDatabase } = await import('../../src/lib/Database.js');
      
      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) {
        clack.log.warn('No agent to reset. Run `sigil agent init` to create one.');
        return;
      }

      const confirmed = await clack.confirm({
        message: `This will destroy agent "${a.name}" and all its data. Continue?`,
      });
      if (clack.isCancel(confirmed) || !confirmed) {
        clack.cancel('Cancelled.');
        return;
      }

      const s = clack.spinner();
      s.start('Destroying agent...');
      await agentManager.destroy(a.id);
      s.stop('Agent destroyed.');

      const reinit = await clack.confirm({
        message: 'Reinitialize a fresh agent now?',
        initialValue: true,
      });
      if (clack.isCancel(reinit) || !reinit) return;

      s.start('Initializing fresh agent...');
      const newAgent = await agentManager.initMainAgent();
      s.stop(`Fresh agent initialized. Wallet: ${newAgent.pubkey}`);
    });
}
