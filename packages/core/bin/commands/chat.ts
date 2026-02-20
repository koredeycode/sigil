import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { getDatabase } from '../../src/lib/Database.js';

export function registerChatCommand(program: Command) {
  program
    .command('chat [agent] [message]')
    .description('Chat with a specific agent')
    .action(async (agent?: string, message?: string) => {
      getDatabase();

      if (!agent) {
        const agents = agentManager.list();
        if (agents.length === 0) {
          clack.log.warning('No agents found. Run `sigil agent create` first.');
          process.exit(0);
        }

        const selected = await clack.select({
          message: 'Which agent do you want to chat with?',
          options: agents.map(a => ({
            value: a.name,
            label: a.name,
            hint: `${a.status} — ${a.pubkey.slice(0, 8)}...`,
          })),
        });
        if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }
        agent = String(selected);
      }

      const a = agentManager.get(agent);
      if (!a) { console.log(`Agent "${agent}" not found.`); return; }

      if (!message) {
        const input = await clack.text({
          message: `Message for ${agent}:`,
          placeholder: 'Type your message...',
          validate: (val) => val.length < 1 ? 'Message cannot be empty' : undefined,
        });
        if (clack.isCancel(input)) { clack.cancel('Cancelled.'); process.exit(0); }
        message = String(input);
      }

      console.log(`You: ${message}`);
      console.log('Agent is thinking...');
      // In headless mode, we'd need the server running. For now, print a note.
      console.log('(Start the server with `sigil start` first, then use chat via API or TUI)');
    });
}
