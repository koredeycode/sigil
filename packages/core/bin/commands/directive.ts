import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { addDirective, deleteDirective, getAllDirectivesForAgent, getDatabase } from '../../src/lib/Database.js';

export function registerDirectiveCommand(program: Command) {
  const directive = program.command('directive').description('Manage directives');

  directive
    .command('add <agent> <text>')
    .description('Add a directive to an agent')
    .action((agent: string, text: string) => {
      getDatabase();
      const a = agentManager.get(agent);
      if (!a) { console.log(`Agent "${agent}" not found.`); return; }
      addDirective(a.id, text, text, undefined, 60);
      console.log(`Directive added to "${agent}": ${text}`);
    });

  directive
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

  directive
    .command('remove <id>')
    .description('Remove a directive by ID')
    .action((id: string) => {
      getDatabase();
      deleteDirective(Number(id));
      console.log(`Directive ${id} removed.`);
    });
}
