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

    case 'ollama':
      // Ollama uses the OpenAI-compatible API
      return new ChatOpenAI({
        openAIApiKey: 'ollama', // dummy key for local
        modelName: provider.model,
        temperature: 0,
        configuration: {
          baseURL: 'http://localhost:11434/v1',
        },
      });

    case 'lmstudio':
      return new ChatOpenAI({
        openAIApiKey: 'lmstudio',
        modelName: provider.model,
        temperature: 0,
        configuration: {
          baseURL: 'http://localhost:1234/v1',
        },
      });

    default:
      // Fallback: treat as OpenAI-compatible API
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: provider.model,
        temperature: 0,
      });
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
 * Build the system prompt for an agent cycle.
 */
export function buildSystemPrompt(
  agentName: string,
  pubkey: string,
  solBalance: number,
  directives: string[]
): string {
  const directiveList = directives.length > 0
    ? directives.map((d, i) => `  ${i + 1}. ${d}`).join('\n')
    : '  (none)';

  return `You are an autonomous Solana wallet agent managing agent "${agentName}" with wallet ${pubkey}.

Your current SOL balance is ${solBalance}.

Your active directives are:
${directiveList}

Use the available tools to fulfill your directives and respond to user requests.
When evaluating directives, check each condition against the current wallet state.
If a directive's condition is met, execute the appropriate action using the available tools.

CRITICAL RULES:
- Never attempt to access private keys directly.
- Never try to bypass guardrails — they are hard-coded safety checks.
- Always report what actions you took and why.
- If you're unsure whether a condition is met, err on the side of NOT acting.
- All operations are on Solana DEVNET — real transactions, test money.`;
}
