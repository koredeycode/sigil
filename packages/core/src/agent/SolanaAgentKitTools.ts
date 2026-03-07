/**
 * @deprecated This file is kept for backwards compatibility only.
 * solana-agent-kit has been removed in favor of custom tools.
 * All functionality now goes through CustomTools.ts which properly
 * integrates with Guardrails and the Transaction Builder.
 */

/**
 * No-op function for API compatibility.
 * @deprecated solana-agent-kit removed - using custom tools only
 */
export function clearAgentKit(_agentName: string): void {
  // No-op: solana-agent-kit has been removed
}

/**
 * @deprecated No longer used - kept for backwards compatibility
 */
export const ESSENTIAL_TOOL_NAMES = new Set<string>();

/**
 * @deprecated No longer used - kept for backwards compatibility
 */
export const agentKitCache = new Map<string, never>();
