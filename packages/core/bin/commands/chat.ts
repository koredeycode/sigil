import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { getDatabase } from '../../src/lib/Database.js';

export function registerChatCommand(program: Command) {
  program
    .command('chat <agent> <message>')
    .description('Chat with a specific agent')
    .action(async (agent: string, message: string) => {
      getDatabase();
      const a = agentManager.get(agent);
      if (!a) { console.log(`Agent "${agent}" not found.`); return; }
      console.log(`You: ${message}`);
      console.log('Agent is thinking...');
      // In headless mode, we'd need the server running. For now, print a note.
      console.log('(Start the server with `sigil start` first, then use chat via API or TUI)');
    });
}
