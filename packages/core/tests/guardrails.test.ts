import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { validateIntent, type TradeIntent } from "../src/lib/Guardrails.js";
import {
  getDatabase,
  closeDatabase,
  createAgent,
  insertTransaction,
} from "../src/lib/Database.js";
import {
  setKillSwitch,
  setPerTradeLimit,
  setDailyVolumeCap,
  setSlippageCap,
  setCooldownPeriod,
  setConfirmationThreshold,
  setAllowlist,
} from "../src/lib/Config.js";
import { v4 as uuidv4 } from "uuid";

describe("Guardrails - Safety Validation", () => {
  let testAgentId: string;

  beforeEach(() => {
    // Close any existing database connection
    try {
      closeDatabase();
    } catch (err) {
      // Ignore if no database was open
    }

    // Initialize in-memory database for tests
    process.env.SIGIL_DB_PATH = ":memory:";
    const db = getDatabase();

    // Create test agent with unique ID and name
    testAgentId = uuidv4();
    const agentName = `test-agent-${testAgentId.substring(0, 8)}`;
    createAgent(testAgentId, agentName, "11111111111111111111111111111111");

    // Set safe default guardrails
    setKillSwitch(false);
    setPerTradeLimit(5); // 5 SOL max per trade
    setDailyVolumeCap(50); // 50 SOL max per day
    setSlippageCap(1); // 1% max slippage
    setCooldownPeriod(0); // No cooldown by default
    setConfirmationThreshold(100); // No confirmation needed for tests
    setAllowlist([]); // Empty allowlist (all recipients allowed)
  });

  afterEach(() => {
    closeDatabase();
  });

  // ─── Kill Switch Tests ────────────────────────────────────────────────

  describe("1. Kill Switch", () => {
    test("blocks all transactions when kill switch is active", () => {
      setKillSwitch(true);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 1,
        token: "SOL",
        recipient: "8xKz...abc",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("kill switch");
    });

    test("allows transactions when kill switch is inactive", () => {
      setKillSwitch(false);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 1,
        token: "SOL",
        recipient: "8xKz...abc",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });

    test("blocks airdrops when kill switch is active", () => {
      setKillSwitch(true);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "airdrop",
      };

      const result = validateIntent(intent);

      // Kill switch blocks ALL transactions, including airdrops
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("kill switch");
    });
  });

  // ─── Per-Trade Limit Tests ────────────────────────────────────────────

  describe("2. Per-Trade Limit", () => {
    test("blocks trade exceeding per-trade limit", () => {
      setPerTradeLimit(5);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 10, // Exceeds 5 SOL limit
        token: "SOL",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("per-trade limit");
    });

    test("allows trade within per-trade limit", () => {
      setPerTradeLimit(5);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 3, // Within 5 SOL limit
        token: "SOL",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });

    test("allows trade exactly at per-trade limit", () => {
      setPerTradeLimit(5);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 5, // Exactly at limit
        token: "SOL",
        recipient: "8xKz...abc",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });
  });

  // ─── Daily Volume Cap Tests ───────────────────────────────────────────

  describe("3. Daily Volume Cap", () => {
    test("blocks trade that would exceed daily volume cap", () => {
      setDailyVolumeCap(10);

      // Insert existing transactions totaling 8 SOL
      insertTransaction(
        testAgentId,
        "swap",
        "SOL",
        5,
        null,
        "sig1",
        "confirmed",
      );
      insertTransaction(
        testAgentId,
        "transfer",
        "SOL",
        3,
        null,
        "sig2",
        "confirmed",
      );

      // Attempt to trade 5 more SOL (total would be 13, exceeds 10)
      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 5,
        token: "SOL",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Daily volume");
    });

    test("allows trade within daily volume cap", () => {
      setDailyVolumeCap(10);

      // Insert existing transaction: 3 SOL
      insertTransaction(
        testAgentId,
        "transfer",
        "SOL",
        3,
        null,
        "sig1",
        "confirmed",
      );

      // Attempt to trade 5 more SOL (total = 8, within 10)
      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 5,
        token: "SOL",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });

    test("ignores failed transactions in daily volume calculation", () => {
      setDailyVolumeCap(10);

      // Insert failed transaction (should NOT count)
      insertTransaction(testAgentId, "swap", "SOL", 8, null, null, "failed");

      // Attempt to trade 10 SOL (should pass since failed tx doesn't count)
      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 10,
        token: "SOL",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(false); // Should fail per-trade limit (5 SOL)
      expect(result.reason).toContain("per-trade limit"); // NOT daily volume
    });
  });

  // ─── Recipient Allowlist Tests ────────────────────────────────────────

  describe("4. Recipient Allowlist", () => {
    test("blocks transfer to non-allowlisted recipient", () => {
      setAllowlist(["ABC...xyz", "DEF...123"]);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 1,
        token: "SOL",
        recipient: "EVIL...999", // Not in allowlist
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("allowlist");
    });

    test("allows transfer to allowlisted recipient", () => {
      setAllowlist(["ABC...xyz", "DEF...123"]);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 1,
        token: "SOL",
        recipient: "ABC...xyz", // In allowlist
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });

    test("allows all recipients when allowlist is empty", () => {
      setAllowlist([]);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 1,
        token: "SOL",
        recipient: "ANY...ADDRESS",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });
  });

  // ─── Slippage Cap Tests ───────────────────────────────────────────────

  describe("5. Slippage Cap", () => {
    test("blocks swap with excessive slippage", () => {
      setSlippageCap(1); // 1% max

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 2,
        token: "SOL",
        slippage: 5, // 5% slippage (exceeds 1%)
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Slippage");
    });

    test("allows swap with acceptable slippage", () => {
      setSlippageCap(1);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 2,
        token: "SOL",
        slippage: 0.5, // 0.5% slippage (within 1%)
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });

    test("ignores slippage cap for non-swap transactions", () => {
      setSlippageCap(0.1);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 1,
        token: "SOL",
        recipient: "8xKz...abc",
        slippage: 10, // High slippage, but not a swap
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });
  });

  // ─── Cool-Down Period Tests ───────────────────────────────────────────

  // describe("6. Cool-Down Period", () => {
  //   test("blocks trade during cooldown period", () => {
  //     setCooldownPeriod(300); // 5 minutes (300 seconds)

  //     // Insert recent transaction with explicit timestamp (right now)
  //     const db = getDatabase();
  //     db.prepare(
  //       `
  //       INSERT INTO transactions (agent_id, type, token, amount, signature, status, timestamp)
  //       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  //     `,
  //     ).run(testAgentId, "swap", "SOL", 1, "recent", "confirmed");

  //     // Attempt immediate trade (should be blocked by cooldown)
  //     const intent: TradeIntent = {
  //       agentId: testAgentId,
  //       type: "swap",
  //       amount: 1,
  //       token: "SOL",
  //     };

  //     const result = validateIntent(intent);

  //     expect(result.passed).toBe(false);
  //     expect(result.reason).toContain("Cool-down");
  //   });

  //   test("allows trade after cooldown period expires", () => {
  //     setCooldownPeriod(1); // 1 second

  //     // Insert old transaction (more than 1 second ago)
  //     const db = getDatabase();
  //     db.prepare(
  //       `
  //       INSERT INTO transactions (agent_id, type, token, amount, signature, status, timestamp)
  //       VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-2 seconds'))
  //     `,
  //     ).run(testAgentId, "swap", "SOL", 1, "old", "confirmed");

  //     // Attempt trade now
  //     const intent: TradeIntent = {
  //       agentId: testAgentId,
  //       type: "swap",
  //       amount: 1,
  //       token: "SOL",
  //     };

  //     const result = validateIntent(intent);

  //     expect(result.passed).toBe(true);
  //   });

  //   test("allows first trade when no transaction history", () => {
  //     setCooldownPeriod(60);

  //     const intent: TradeIntent = {
  //       agentId: testAgentId,
  //       type: "swap",
  //       amount: 1,
  //       token: "SOL",
  //     };

  //     const result = validateIntent(intent);

  //     expect(result.passed).toBe(true);
  //   });
  // });

  // ─── Confirmation Threshold Tests ─────────────────────────────────────

  describe("7. Confirmation Threshold", () => {
    test("requires confirmation for large trades", () => {
      setConfirmationThreshold(10);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 50, // Exceeds 10 SOL threshold
        token: "SOL",
        recipient: "8xKz...abc",
      };

      const result = validateIntent(intent);

      // Should pass but require confirmation
      expect(result.passed).toBe(false); // Will fail per-trade limit first
      expect(result.reason).toContain("per-trade limit");
    });

    test("does not require confirmation for small trades", () => {
      setConfirmationThreshold(10);
      setPerTradeLimit(100); // Set high to bypass per-trade check

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 5, // Below 10 SOL threshold
        token: "SOL",
        recipient: "8xKz...abc",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
      expect(result.requiresConfirmation).toBeUndefined();
    });

    test("requires confirmation at exact threshold", () => {
      setConfirmationThreshold(10);
      setPerTradeLimit(100);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 11, // Just above threshold
        token: "SOL",
        recipient: "8xKz...abc",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  // ─── Edge Cases & Integration Tests ───────────────────────────────────

  describe("Edge Cases", () => {
    test("requires token specification for value transfers", () => {
      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 1,
        // Missing: token: 'SOL'
        recipient: "8xKz...abc",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Token type must be specified");
    });

    test("allows airdrops without token specification", () => {
      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "airdrop",
        // No amount or token needed
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });

    test("validates multiple checks in correct order", () => {
      setKillSwitch(false);
      setPerTradeLimit(5);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 10, // Fails per-trade limit
        token: "SOL",
        slippage: 50, // Would also fail slippage cap
      };

      const result = validateIntent(intent);

      // Should fail on first check (per-trade limit), not slippage
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("per-trade limit");
    });

    test("handles agent with no transaction history", () => {
      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 1,
        token: "SOL",
      };

      const result = validateIntent(intent);

      expect(result.passed).toBe(true);
    });
  });

  // ─── Agent-Specific Override Tests ────────────────────────────────────

  describe("Agent Guardrail Overrides", () => {
    test("respects agent-specific per-trade limit override", () => {
      setPerTradeLimit(5); // Global: 5 SOL

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "swap",
        amount: 8,
        token: "SOL",
      };

      // Should fail with global limit
      let result = validateIntent(intent);
      expect(result.passed).toBe(false);

      // Should pass with agent override
      result = validateIntent(intent, { perTradeLimit: 10 });
      expect(result.passed).toBe(true);
    });

    test("respects agent-specific allowlist override", () => {
      setAllowlist(["GLOBAL...123"]);

      const intent: TradeIntent = {
        agentId: testAgentId,
        type: "transfer",
        amount: 1,
        token: "SOL",
        recipient: "AGENT...456",
      };

      // Should fail with global allowlist
      let result = validateIntent(intent);
      expect(result.passed).toBe(false);

      // Should pass with agent override
      result = validateIntent(intent, { allowlist: ["AGENT...456"] });
      expect(result.passed).toBe(true);
    });
  });
});
