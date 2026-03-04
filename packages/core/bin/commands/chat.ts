import * as clack from '@clack/prompts';
import type { Command } from 'commander';

export function registerChatCommand(program: Command) {
  program
    .command('chat [message]')
    .description('Chat with the main Sigil agent')
    .action(async (message?: string) => {
      const { agentManager } = await import('../../src/agent/AgentManager.js');
      const { getDatabase, insertChat } = await import('../../src/lib/Database.js');
      
      getDatabase();

      const agent = agentManager.getMainAgent();
      if (!agent) {
        clack.log.warn('Agent not initialized. Run `sigil agent init` first.');
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

      clack.log.step(`You: ${message}`);
      
      const s = clack.spinner();
      s.start('Agent is thinking...');

      try {
        insertChat(agent.id, 'user', message);

        const { response, toolResults } = await agentManager.invoke(agent.id, message, {
          includeHistory: true,
        });

        insertChat(agent.id, 'assistant', response);

        if (toolResults.length > 0) {
          s.stop('Agent finished thinking');
          clack.log.message('┌─ Tool Calls ─────────────────────');
          for (const tr of toolResults) {
            clack.log.message(`│ ⚡ ${tr.tool}`);
            const resultPreview = tr.result.length > 120 ? tr.result.substring(0, 120) + '...' : tr.result;
            clack.log.message(`│   → ${resultPreview}`);
          }
          clack.log.message('└──────────────────────────────────');
        } else {
            s.stop('Agent finished thinking');
        }

        clack.log.success(`${agent.name}: ${response}`);
      } catch (error) {
          s.stop('Error processing request.');
          clack.log.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
}
