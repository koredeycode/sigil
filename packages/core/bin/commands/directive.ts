import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { addDirective, deleteDirective, getAllDirectivesForAgent, getDatabase } from '../../src/lib/Database.js';

/** Helper: prompt user to pick an agent. */
async function selectAgent(): Promise<string> {
  const agents = agentManager.list();
  if (agents.length === 0) {
    clack.log.warning('No agents found. Run `sigil agent create` first.');
    process.exit(0);
  }

  const selected = await clack.select({
    message: 'Select an agent:',
    options: agents.map(a => ({
      value: a.name,
      label: a.name,
      hint: `${a.status} — ${a.pubkey.slice(0, 8)}...`,
    })),
  });

  if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
  return String(selected);
}

export function registerDirectiveCommand(program: Command) {
  const directive = program.command('directive').description('Manage directives');

  directive
    .command('add [agent] [text]')
    .description('Add a directive to an agent')
    .action(async (agent?: string, text?: string) => {
      getDatabase();

      if (!agent) {
        clack.intro('Add a directive');
        agent = await selectAgent();
      }

      const a = agentManager.get(agent);
      if (!a) { console.log(`Agent "${agent}" not found.`); return; }

      if (!text) {
        const input = await clack.text({
          message: `Enter directive for "${agent}":`,
          placeholder: 'e.g. If SOL balance < 2, request an airdrop',
          validate: (val) => val.length < 1 ? 'Directive cannot be empty' : undefined,
        });
        if (clack.isCancel(input)) { clack.cancel('Cancelled.'); process.exit(0); }
        text = String(input);
      }

      addDirective(a.id, text, text, undefined, 60);
      clack.log.success(`Directive added to "${agent}": ${text}`);
    });

  directive
    .command('list [agent]')
    .description('View an agent\'s directives')
    .action(async (agent?: string) => {
      getDatabase();

      if (!agent) agent = await selectAgent();

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
    .command('remove [id]')
    .description('Remove a directive by ID')
    .action(async (id?: string) => {
      getDatabase();

      if (!id) {
        clack.intro('Remove a directive');
        const agentName = await selectAgent();
        const a = agentManager.get(agentName);
        if (!a) { console.log(`Agent "${agentName}" not found.`); return; }

        const directives = getAllDirectivesForAgent(a.id);
        if (directives.length === 0) {
          clack.log.warning('No directives to remove.');
          process.exit(0);
        }

        const selected = await clack.select({
          message: 'Which directive to remove?',
          options: directives.map(d => ({
            value: String(d.id),
            label: `[${d.id}] ${d.condition} → ${d.action}`,
            hint: d.is_active ? 'active' : 'inactive',
          })),
        });
        if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
        id = String(selected);
      }

      const confirmed = await clack.confirm({
        message: `Remove directive ${id}?`,
      });
      if (clack.isCancel(confirmed) || !confirmed) {
        clack.cancel('Cancelled.');
        return;
      }

      deleteDirective(Number(id));
      clack.log.success(`Directive ${id} removed.`);
    });
}
