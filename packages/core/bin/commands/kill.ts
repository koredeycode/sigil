import * as clack from '@clack/prompts';
import type { Command } from 'commander';

export function registerKillCommand(program: Command) {
  program
    .command('kill [agent]')
    .description('Activate kill switch — stops all agents or a specific one')
    .action(async (_agent?: string) => {
      const { agentManager } = await import('../../src/agent/AgentManager.js');
      const { setKillSwitch } = await import('../../src/lib/Config.js');
      const { getDatabase } = await import('../../src/lib/Database.js');
      
      getDatabase();

      if (_agent) {
        // Targeted kill — confirm
        const confirmed = await clack.confirm({
          message: `Kill agent "${_agent}"? This will wipe its key from memory.`,
        });
        if (clack.isCancel(confirmed) || !confirmed) {
          clack.cancel('Cancelled.');
          return;
        }

        agentManager.kill(_agent);
        clack.log.success(`Agent "${_agent}" paused. Key wiped from memory.`);
      } else {
        // Global kill — confirm with warning
        clack.log.warning('This will activate the global kill switch and halt ALL agents.');

        const confirmed = await clack.confirm({
          message: 'Are you sure you want to activate the global kill switch?',
        });
        if (clack.isCancel(confirmed) || !confirmed) {
          clack.cancel('Cancelled.');
          return;
        }

        setKillSwitch(true);
        agentManager.killAll();
        clack.log.success('Global kill switch activated. All agents halted.');
      }
    });
}
