import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { setKillSwitch } from '../../src/lib/Config.js';
import { getDatabase } from '../../src/lib/Database.js';

export function registerKillCommand(program: Command) {
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
}
