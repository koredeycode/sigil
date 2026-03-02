import bs58 from 'bs58';
import { SolanaAgentKit } from 'solana-agent-kit';
import { getRpcUrl } from '../lib/Config.js';
import { getKeypair } from '../wallet/Wallet.js';

/**
 * Cached SolanaAgentKit instances per agent name.
 */
export const agentKitCache = new Map<string, SolanaAgentKit>();

/**
 * Get or create a SolanaAgentKit instance for a given agent.
 */
export async function getSolanaAgentKit(agentName: string): Promise<SolanaAgentKit> {
  if (agentKitCache.has(agentName)) {
    return agentKitCache.get(agentName)!;
  }

  const keypair = await getKeypair(agentName);
  const privateKeyBase58 = bs58.encode(keypair.secretKey);
  const rpcUrl = getRpcUrl();

  const agent = new SolanaAgentKit(privateKeyBase58, rpcUrl, {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  });

  agentKitCache.set(agentName, agent);
  return agent;
}

/**
 * Clear the cached SolanaAgentKit instance for an agent.
 */
export function clearAgentKit(agentName: string): void {
  agentKitCache.delete(agentName);
}

/**
 * Essential tools subset to avoid LLM token limits (8k TPM on Groq/OpenRouter).
 */
export const ESSENTIAL_TOOL_NAMES = new Set([
  'solana_balance',
  'solana_balance_other',
  'solana_transfer',
  'solana_request_funds',
  'solana_get_wallet_address',
  'solana_deploy_token',
  'solana_token_data',
  'solana_token_data_by_ticker',
  'solana_trade',
  'solana_fetch_price',
  'solana_stake',
  'solana_deploy_collection',
  'solana_mint_nft',
  'solana_register_domain',
  'solana_resolve_domain',
  'solana_get_domain',
  'solana_lend_asset',
  'solana_tps_calculator',
  'solana_get_info',
  'solana_fetch_token_report_summary',
  'solana_fetch_token_detailed_report',
  'solana_pyth_fetch_price',
  'solana_close_empty_token_accounts',
  'solana_get_asset',
  'solana_get_all_assets_by_owner'
]);
