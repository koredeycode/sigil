import { createSolanaTools } from 'solana-agent-kit';
import { logger } from '../lib/Logger.js';
import { createCustomTools } from './CustomTools.js';
import { createOrchestratorTools } from './OrchestratorTools.js';
import { ESSENTIAL_TOOL_NAMES, clearAgentKit, getSolanaAgentKit } from './SolanaAgentKitTools.js';

/**
 * TOOL REGISTRY MODE
 * 
 * @deprecated 'curated' - Efficient subset of solana-agent-kit tools. 
 * Deprecated because direct solana-agent-kit tools bypass Sigil's internal 
 * guardrails and transaction builder. Use 'custom' instead.
 * 
 * @deprecated 'full' - All 100+ solana-agent-kit tools.
 * Deprecated for the same reason: lack of guardrail integration and 
 * vulnerability to prompt injection bypassing security layers.
 * 
 * 'custom' - Sigil-native tools that route through Guardrails & Signer.
 */
const TOOL_REGISTRY_MODE: 'curated' | 'full' | 'custom' = 'custom';

/**
 * Main entry point for creating tools.
 * Prioritizes the TOOL_REGISTRY_MODE flag in this file.
 * Orchestrator tools (agent management, cron) are appended exclusively for the sigil agent.
 */
export async function createTools(agentName: string, agentId?: string) {
  let tools;

  // Use 'custom' if the file flag says so
  if (TOOL_REGISTRY_MODE === 'custom') {
    if (!agentId) {
      const { getAgent } = await import('../lib/Database.js');
      const agent = getAgent(agentName);
      agentId = agent?.id;
    }
    logger.info(`Using CUSTOM toolset for ${agentName}`);
    tools = createCustomTools(agentId || 'unknown', agentName);
  } else {
    const kit = await getSolanaAgentKit(agentName);
    const allTools = createSolanaTools(kit);

    if (TOOL_REGISTRY_MODE === 'full') {
      logger.info(`Using FULL toolset (${allTools.length} tools) for ${agentName}`);
      tools = allTools;
    } else {
      const curatedTools = allTools.filter(tool => ESSENTIAL_TOOL_NAMES.has(tool.name));
      logger.info(`Using CURATED toolset (${curatedTools.length} tools) for ${agentName}`);
      tools = curatedTools;
    }
  }

  // Orchestrator tools are exclusive to the sigil master agent
  if (agentName === 'sigil') {
    const orchestratorTools = createOrchestratorTools();
    tools = [...tools, ...orchestratorTools];
    logger.info(`+${orchestratorTools.length} orchestrator tools for sigil`);
  }

  return tools;
}

export { clearAgentKit };
