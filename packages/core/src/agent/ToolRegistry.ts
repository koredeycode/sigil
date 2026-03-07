import { logger } from '../lib/Logger.js';
import { createCustomTools } from './CustomTools.js';
import { createOrchestratorTools } from './OrchestratorTools.js';

/**
 * Main entry point for creating tools.
 * Uses Sigil-native custom tools that route through Guardrails & Signer.
 * Orchestrator tools (agent management, cron) are appended exclusively for the sigil agent.
 */
export async function createTools(agentName: string, agentId?: string) {
  if (!agentId) {
    const { getAgent } = await import('../lib/Database.js');
    const agent = getAgent(agentName);
    agentId = agent?.id;
  }
  
  logger.info(`Using CUSTOM toolset for ${agentName}`);
  let tools = createCustomTools(agentId || 'unknown', agentName);

  // Orchestrator tools are exclusive to the sigil master agent
  if (agentName === 'sigil') {
    const orchestratorTools = createOrchestratorTools();
    tools = [...tools, ...orchestratorTools];
    logger.info(`+${orchestratorTools.length} orchestrator tools for sigil`);
  }

  return tools;
}

/**
 * No-op function for API compatibility.
 * @deprecated solana-agent-kit removed - using custom tools only
 */
export function clearAgentKit(_agentName: string): void {
  // No-op: solana-agent-kit has been removed
}
