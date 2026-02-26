import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import { agentManager } from '../../src/agent/AgentManager.js';
import { getDatabase, insertChat } from '../../src/lib/Database.js';

export function registerChatCommand(program: Command) {
  program
    .command('chat [message]')
    .description('Chat with the main Sigil agent')
    .action(async (message?: string) => {
      getDatabase();

      const agent = agentManager.getMainAgent();
      if (!agent) {
        console.log('  Agent not initialized. Run `sigil agent init` first.');
        process.exit(1);
      }

      if (!message) {
        const input = await clack.text({
          message: `Message for ${agent.name}:`,
          placeholder: 'Type your message...',
          validate: (val) => val.length < 1 ? 'Message cannot be empty' : undefined,
        });
        if (clack.isCancel(input)) { clack.cancel('Cancelled.'); process.exit(0); }
        message = String(input);
      }

      console.log(`\n  You: ${message}`);
      console.log('  Agent is thinking...\n');

      try {
        insertChat(agent.id, 'user', message);

        const { response, toolResults } = await agentManager.invoke(agent.id, message, {
          includeHistory: true,
        });

        insertChat(agent.id, 'assistant', response);

        if (toolResults.length > 0) {
          console.log('  ┌─ Tool Calls ─────────────────────');
          for (const tr of toolResults) {
            console.log(`  │ ⚡ ${tr.tool}`);
            const resultPreview = tr.result.length > 120 ? tr.result.substring(0, 120) + '...' : tr.result;
            console.log(`  │   → ${resultPreview}`);
          }
          console.log('  └──────────────────────────────────\n');
        }

        console.log(`  ${agent.name}: ${response}\n`);
      } catch (error) {
        console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
}
