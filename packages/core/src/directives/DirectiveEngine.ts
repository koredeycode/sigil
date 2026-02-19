import { DirectiveRow, getAgentDirectives, updateDirectiveLastExec } from '../lib/Database.js';

export interface DirectiveEvaluation {
  directive: DirectiveRow;
  triggered: boolean;
  reasoning: string;
}

export interface EvalContext {
  solBalance: number;
  tokenAccounts: Array<{
    mint: string;
    symbol?: string;
    balance: number;
    percentage: number;
  }>;
  portfolioValue: number;
}

/**
 * Load and filter active directives for an agent.
 * Checks cooldown periods — skips directives that fired too recently.
 */
export function getEvaluableDirectives(agentId: string): DirectiveRow[] {
  const directives = getAgentDirectives(agentId);
  const now = Date.now();

  return directives.filter((d) => {
    // Skip if cooldown hasn't elapsed
    if (d.cooldown > 0 && d.last_exec) {
      const lastExec = new Date(d.last_exec).getTime();
      const elapsed = (now - lastExec) / 1000;
      if (elapsed < d.cooldown) return false;
    }
    return true;
  });
}

/**
 * Build an LLM prompt to evaluate a single directive against the current state.
 */
export function buildEvalPrompt(directive: DirectiveRow, context: EvalContext): string {
  const tokenSummary = context.tokenAccounts
    .map((t) => `  - ${t.symbol ?? t.mint}: ${t.balance} (${t.percentage.toFixed(1)}%)`)
    .join('\n');

  return `You are evaluating whether a directive's condition is currently met.

Current wallet state:
  SOL Balance: ${context.solBalance}
  Total Portfolio Value: ${context.portfolioValue} SOL
  Token Accounts:
${tokenSummary || '    (none)'}

Directive condition: "${directive.condition}"
Directive action: "${directive.action}"
${directive.max_amount ? `Max amount: ${directive.max_amount}` : ''}

Is the condition currently met? Respond with a JSON object:
{
  "triggered": true or false,
  "reasoning": "brief explanation of why the condition is or is not met",
  "suggestedAction": "if triggered, the specific tool call to make (e.g., request_airdrop, transfer_sol)"
}

Respond ONLY with the JSON object, no other text.`;
}

/**
 * Parse the LLM's directive evaluation response.
 */
export function parseEvalResponse(response: string): {
  triggered: boolean;
  reasoning: string;
  suggestedAction?: string;
} {
  try {
    // Try to extract JSON from the response (LLM may include markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { triggered: false, reasoning: 'Failed to parse LLM response' };
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      triggered: Boolean(parsed.triggered),
      reasoning: String(parsed.reasoning ?? ''),
      suggestedAction: parsed.suggestedAction,
    };
  } catch {
    return { triggered: false, reasoning: 'Failed to parse LLM response as JSON' };
  }
}

/**
 * Mark a directive as having fired (update last_exec timestamp).
 */
export function markDirectiveFired(directiveId: number): void {
  updateDirectiveLastExec(directiveId);
}
