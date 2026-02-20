import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { setKillSwitch } from '../../src/lib/Config.js';
import { getDatabase } from '../../src/lib/Database.js';

export function registerKillCommand(program: Command) {
  program
    .command('kill [agent]')
    .description('Activate kill switch — stops all agents or a specific one')
    .action(async (_agent?: string) => {
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
        clack.log.success(`Agent "${_agent}" killed. Key wiped from memory.`);
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
