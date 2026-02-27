import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { decryptApiKey } from '../lib/Auth.js';
import { getPrimaryProvider, ProviderRow } from '../lib/Database.js';

/**
 * Create a LangChain chat model from a provider configuration.
 */
export function createModel(provider: ProviderRow): BaseChatModel {
  const apiKey = provider.api_key ? decryptApiKey(provider.api_key) : undefined;

  switch (provider.name.toLowerCase()) {
    case 'openai':
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: provider.model,
        temperature: 0,
      });

    case 'anthropic':
      return new ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName: provider.model,
        temperature: 0,
      });

    case 'groq':
      return new ChatGroq({
        apiKey: apiKey,
        modelName: provider.model,
        temperature: 0,
      });

    case 'google':
      return new ChatGoogleGenerativeAI({
        apiKey: apiKey,
        modelName: provider.model,
        temperature: 0,
      });

    case 'custom':
    default: {
      // Custom or unknown provider — use base_url + compat to route
      const baseURL = provider.base_url ?? undefined;
      const compat = provider.compat ?? 'openai';

      if (compat === 'anthropic') {
        return new ChatAnthropic({
          anthropicApiKey: apiKey || 'none',
          modelName: provider.model,
          temperature: 0,
          ...(baseURL ? { clientOptions: { baseURL } } : {}),
        });
      }

      // Default to OpenAI-compatible
      return new ChatOpenAI({
        openAIApiKey: apiKey || 'none',
        modelName: provider.model,
        temperature: 0,
        ...(baseURL ? { configuration: { baseURL } } : {}),
      });
    }
  }
}

/**
 * Get the primary LLM model from the configured providers.
 * Throws if no primary provider is set.
 */
export function getPrimaryModel(): BaseChatModel {
  const provider = getPrimaryProvider();
  if (!provider) {
    throw new Error(
      'No primary LLM provider configured. Run `sigil provider add` to set one up.'
    );
  }
  return createModel(provider);
}

/**
 * Build the system prompt for the LangGraph agent.
 * The agent fetches its own balance and state via tools.
 */
export function buildSystemPrompt(
  agentName: string,
  pubkey: string,
  prompt?: string | null
): string {
  const customInstructions = prompt
    ? `\nYour specific instructions for this session:\n${prompt}\n`
    : '';

  return `You are Sigil, an autonomous Solana wallet agent managing agent "${agentName}" with wallet ${pubkey}.

You have access to an extensive set of Solana tools including:
- Token operations: check balance, transfer SOL/SPL tokens, swap via Jupiter, deploy tokens
- DeFi: Raydium pools, Orca whirlpools, Drift trading, lending/borrowing via Lulo
- NFTs: mint, list for sale, manage collections via Metaplex and 3Land
- Intelligence: price feeds via Pyth/CoinGecko, token data, rug checks
- Domain: register and resolve .sol domains via SNS
- Cross-chain: bridge via Wormhole and deBridge
- And many more specialized Solana tools
${customInstructions}

INSTRUCTIONS:
- Use your tools to fetch current state (balance, tokens, prices) before making decisions.
- For user conversations, be helpful and execute requested actions using your tools.
- Always explain what you did and why after taking actions.
- When asked about capabilities, describe the tools available to you.

CRITICAL RULES:
- Never attempt to access private keys directly.
- Never try to bypass guardrails — they are hard-coded safety checks.
- If you're unsure whether a condition is met, err on the side of NOT acting.
- All operations are on Solana DEVNET — real transactions, test money.
- Always confirm large transfers (> 1 SOL) by explaining the action before executing.`;
}
