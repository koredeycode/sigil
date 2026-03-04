import {
    getConfirmationThreshold,
    getCooldownPeriod,
    getDailyVolumeCap,
    getPerTradeLimit,
    getSlippageCap,
    isKillSwitchActive,
} from './Config.js';
import { getAgentTransactions, getDailyVolume } from './Database.js';

export interface GuardrailResult {
  passed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
}

export interface TradeIntent {
  agentId: string;
  type: 'transfer' | 'swap' | 'mint' | 'burn' | 'airdrop' | 'create_token' | 'close_account' | 'create_pool' | 'stake' | 'memo';
  amount?: number;        // in SOL equivalent
  recipient?: string;
  slippage?: number;      // percentage for swaps
  portfolioValue?: number; // total portfolio in SOL for % calculations
}

/**
 * Agent-specific guardrail overrides.
 * If provided, these take precedence over global defaults.
 */
export interface AgentGuardrailOverrides {
  perTradeLimit?: number;
  dailyVolumeCap?: number;
  slippageCap?: number;
  cooldownPeriod?: number;
  confirmationThreshold?: number;
  allowlist?: string[];
}

/**
 * Run all 7 guardrail checks against a trade intent.
 * Returns a result indicating whether the trade is allowed.
 *
 * Check order (per ARCHITECTURE.md):
 * 1. Kill Switch
 * 2. Per-Trade Limit
 * 3. Daily Volume Cap
 * 4. Recipient Allowlist
 * 5. Slippage Cap
 * 6. Cool-Down Check
 * 7. Confirmation Threshold
 */
export function validateIntent(
  intent: TradeIntent,
  overrides?: AgentGuardrailOverrides
): GuardrailResult {
  // 1. KILL SWITCH CHECK
  if (isKillSwitchActive()) {
    return { passed: false, reason: 'Global kill switch is active. All signing is halted.' };
  }

  // Airdrops skip most guardrails (they're free)
  if (intent.type === 'airdrop') {
    return { passed: true };
  }

  // 2. PER-TRADE LIMIT
  if (intent.amount != null && intent.portfolioValue != null && intent.portfolioValue > 0) {
    const limit = overrides?.perTradeLimit ?? getPerTradeLimit();
    const tradePercent = (intent.amount / intent.portfolioValue) * 100;
    if (tradePercent > limit) {
      return {
        passed: false,
        reason: `Trade amount (${tradePercent.toFixed(1)}% of portfolio) exceeds per-trade limit (${limit}%).`,
      };
    }
  }

  // 3. DAILY VOLUME CAP
  if (intent.amount != null) {
    const cap = overrides?.dailyVolumeCap ?? getDailyVolumeCap();
    const dailyTotal = getDailyVolume(intent.agentId);
    if (dailyTotal + intent.amount > cap) {
      return {
        passed: false,
        reason: `Daily volume would reach ${(dailyTotal + intent.amount).toFixed(2)} SOL, exceeding cap of ${cap} SOL.`,
      };
    }
  }

  // 4. RECIPIENT ALLOWLIST
  if (intent.recipient && overrides?.allowlist && overrides.allowlist.length > 0) {
    if (!overrides.allowlist.includes(intent.recipient)) {
      return {
        passed: false,
        reason: `Recipient ${intent.recipient} is not on the allowlist.`,
      };
    }
  }

  // 5. SLIPPAGE CAP (for swaps)
  if (intent.type === 'swap' && intent.slippage != null) {
    const maxSlippage = overrides?.slippageCap ?? getSlippageCap();
    if (intent.slippage > maxSlippage) {
      return {
        passed: false,
        reason: `Slippage (${intent.slippage}%) exceeds maximum (${maxSlippage}%).`,
      };
    }
  }

  // 6. COOL-DOWN CHECK
  const cooldown = overrides?.cooldownPeriod ?? getCooldownPeriod();
  if (cooldown > 0) {
    const recentTxs = getAgentTransactions(intent.agentId, 1);
    if (recentTxs.length > 0) {
      const lastTx = recentTxs[0];
      const lastTxTime = new Date(lastTx.timestamp).getTime();
      const now = Date.now();
      const elapsed = (now - lastTxTime) / 1000;
      if (elapsed < cooldown) {
        return {
          passed: false,
          reason: `Cool-down active. Last trade was ${elapsed.toFixed(0)}s ago (minimum: ${cooldown}s).`,
        };
      }
    }
  }

  // 7. CONFIRMATION THRESHOLD
  if (intent.amount != null) {
    const threshold = overrides?.confirmationThreshold ?? getConfirmationThreshold();
    if (intent.amount > threshold) {
      return {
        passed: true,
        requiresConfirmation: true,
        reason: `Trade value (${intent.amount} SOL) exceeds confirmation threshold (${threshold} SOL). User confirmation required.`,
      };
    }
  }

  // ALL CHECKS PASSED
  return { passed: true };
}
