import { createSolanaTools } from 'solana-agent-kit';
import { createLegacyTools } from './LegacyTools.js';
import { ESSENTIAL_TOOL_NAMES, clearAgentKit, getSolanaAgentKit } from './SolanaAgentKitTools.js';

/**
 * TOOL REGISTRY MODE
 * 'curated' - Efficient subset of solana-agent-kit tools (default)
 * 'full'    - All 100+ solana-agent-kit tools (vulnerable to token limits)
 * 'legacy'  - Original custom-built tools (DynamicStructuredTool)
 */
const TOOL_REGISTRY_MODE: 'curated' | 'full' | 'legacy' = 'curated';

/**
 * Main entry point for creating tools.
 * Prioritizes the TOOL_REGISTRY_MODE flag in this file.
 */
export async function createTools(agentName: string, agentId?: string) {
  // Use 'legacy' if the file flag says so
  if (TOOL_REGISTRY_MODE === 'legacy') {
    if (!agentId) {
      const { getAgent } = await import('../lib/Database.js');
      const agent = getAgent(agentName);
      agentId = agent?.id;
    }
    console.log(`[ToolRegistry] Using LEGACY toolset for ${agentName}`);
    return createLegacyTools(agentId || 'unknown', agentName);
  }

  const kit = await getSolanaAgentKit(agentName);
  const allTools = createSolanaTools(kit);
  
  if (TOOL_REGISTRY_MODE === 'full') {
    console.log(`[ToolRegistry] Using FULL toolset (${allTools.length} tools) for ${agentName}`);
    return allTools;
  }

  const curatedTools = allTools.filter(tool => ESSENTIAL_TOOL_NAMES.has(tool.name));
  console.log(`[ToolRegistry] Using CURATED toolset (${curatedTools.length} tools) for ${agentName}`);
  return curatedTools;
}

export { clearAgentKit };
