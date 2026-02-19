import { addDirective } from '../lib/Database.js';

export interface ParsedDirective {
  condition: string;
  action: string;
  maxAmount?: string;
  cooldown: number;
}

/**
 * Build a prompt to parse a natural language directive into structured fields.
 */
export function buildParsePrompt(naturalLanguage: string): string {
  return `Parse the following natural language directive into structured fields.

Directive: "${naturalLanguage}"

Respond with a JSON object:
{
  "condition": "the trigger condition (when should this fire?)",
  "action": "the action to take when triggered",
  "maxAmount": "maximum amount per execution (e.g., '2 SOL', '10%'), or null if not specified",
  "cooldown": suggested cooldown in seconds between executions (integer, default to 300 if periodic, 60 if reactive)
}

Examples:
- "If SOL balance drops below 2, request a devnet airdrop"
  → { "condition": "SOL balance < 2", "action": "request_airdrop", "maxAmount": "2 SOL", "cooldown": 300 }

- "Send 0.5 SOL to ABC123 every 2 hours"
  → { "condition": "Every 7200 seconds", "action": "transfer_sol to ABC123 amount 0.5", "maxAmount": "0.5 SOL", "cooldown": 7200 }

- "Never let any single token exceed 40% of total portfolio value"
  → { "condition": "Any token allocation > 40%", "action": "rebalance_portfolio", "maxAmount": "10%", "cooldown": 600 }

Respond ONLY with the JSON object, no other text.`;
}

/**
 * Parse the LLM's response into a structured directive.
 */
export function parseDirectiveResponse(response: string): ParsedDirective {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      condition: String(parsed.condition),
      action: String(parsed.action),
      maxAmount: parsed.maxAmount ?? undefined,
      cooldown: parseInt(parsed.cooldown, 10) || 60,
    };
  } catch {
    // If parsing fails, use the raw text as both condition and action
    return {
      condition: response,
      action: response,
      cooldown: 60,
    };
  }
}

/**
 * Store a parsed directive in the database.
 */
export function storeDirective(agentId: string, parsed: ParsedDirective) {
  return addDirective(
    agentId,
    parsed.condition,
    parsed.action,
    parsed.maxAmount,
    parsed.cooldown
  );
}
