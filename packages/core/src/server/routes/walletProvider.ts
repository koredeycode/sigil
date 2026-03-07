import {
    Connection,
    PublicKey,
    Transaction,
    VersionedTransaction,
} from "@solana/web3.js";
import { Router } from "express";
import { agentManager } from "../../agent/AgentManager.js";
import { getRpcUrl } from "../../lib/Config.js";
import { logger } from "../../lib/Logger.js";
import { getKeypair } from "../../wallet/Wallet.js";
import { validateBody } from "../middleware/validate.js";
import {
    signTransactionSchema,
    simulateTransactionSchema,
} from "../schemas.js";

export const walletProviderRouter: Router = Router();

function getConnection(): Connection {
  return new Connection(getRpcUrl(), "confirmed");
}

// POST /api/wallet/provider/connect
// Accepts optional agentId in body to select a specific agent (defaults to main agent)
walletProviderRouter.post("/connect", (req, res) => {
  try {
    const agentId = req.body?.agentId;
    const agent = agentId
      ? agentManager.get(agentId)
      : agentManager.getMainAgent();

    if (!agent || !agent.pubkey) {
      res.status(404).json({
        message: agentId
          ? `Agent "${agentId}" not found`
          : "No active agent found",
        data: null,
      });
      return;
    }

    // Return pubkey, name, and id to the client
    res.json({
      message: "Success",
      data: { publicKey: agent.pubkey, name: agent.name, id: agent.id },
    });
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : String(err),
      data: null,
    });
  }
});

// GET /api/wallet/provider/portfolio
// Accepts optional agentId query param to select a specific agent (defaults to main agent)
walletProviderRouter.get("/portfolio", async (req, res) => {
  try {
    const agentId = req.query.agentId as string | undefined;
    const agent = agentId
      ? agentManager.get(agentId)
      : agentManager.getMainAgent();

    if (!agent || !agent.pubkey) {
      res.status(404).json({
        message: agentId
          ? `Agent "${agentId}" not found`
          : "No active agent found",
        data: null,
      });
      return;
    }

    const connection = getConnection();
    const pubkey = new PublicKey(agent.pubkey);

    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / 1e9;

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      },
    );

    const tokens = tokenAccounts.value.map((ta) => {
      const info = ta.account.data.parsed.info;
      return {
        address: ta.pubkey.toBase58(),
        mint: info.mint,
        balance: info.tokenAmount.uiAmount ?? 0,
        decimals: info.tokenAmount.decimals,
        symbol: info.tokenAmount.uiAmountString,
      };
    });

    res.json({
      message: "Success",
      data: {
        sol: solBalance,
        solLamports: balance,
        tokens,
        pubkey: agent.pubkey,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : String(error),
      data: null,
    });
  }
});

// GET /api/wallet/provider/transactions
// Accepts optional agentId query param to select a specific agent (defaults to main agent)
walletProviderRouter.get("/transactions", async (req, res) => {
  try {
    const agentId = req.query.agentId as string | undefined;
    const agent = agentId
      ? agentManager.get(agentId)
      : agentManager.getMainAgent();

    if (!agent || !agent.pubkey) {
      res.status(404).json({
        message: agentId
          ? `Agent "${agentId}" not found`
          : "No active agent found",
        data: null,
      });
      return;
    }

    const connection = getConnection();
    const pubkey = new PublicKey(agent.pubkey);
    const limit = 20;

    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit,
    });

    const transactions = signatures.map((s) => ({
      signature: s.signature,
      blockTime: s.blockTime
        ? new Date(s.blockTime * 1000).toISOString()
        : null,
      slot: s.slot,
      status: s.confirmationStatus,
      err: s.err,
      memo: s.memo,
    }));

    res.json({ message: "Success", data: transactions });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : String(error),
      data: null,
    });
  }
});

// GET /api/wallet/provider/validators
walletProviderRouter.get("/validators", async (req, res) => {
  try {
    const connection = getConnection();
    const voteAccounts = await connection.getVoteAccounts();

    // Sort by activated stake (highest first) and take top 20
    const sorted = voteAccounts.current
      .sort((a, b) => b.activatedStake - a.activatedStake)
      .slice(0, 20);

    const validators = sorted.map((v, i) => ({
      rank: i + 1,
      name: v.votePubkey.slice(0, 8) + "...", // Placeholder name logic
      voteAccount: v.votePubkey,
      nodeIdentity: v.nodePubkey,
      activatedStake: v.activatedStake / 1e9,
      commission: v.commission,
      lastVote: v.lastVote,
    }));

    res.json({ message: "Success", data: validators });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : String(error),
      data: null,
    });
  }
});

const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111";

/**
 * Decode known program instruction data into human-readable text.
 * Falls back to raw hex for unknown programs.
 */
function decodeInstructionData(
  programId: string,
  data: Uint8Array,
  accounts: string[],
): string {
  if (programId === SYSTEM_PROGRAM_ID && data.length >= 4) {
    const ixType = data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
    if (ixType === 2 && data.length >= 12) {
      // Transfer instruction: 4-byte type + 8-byte lamports (little-endian u64)
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const lamports = Number(view.getBigUint64(4, true));
      const sol = lamports / 1e9;
      return `System Program: Transfer ${sol} SOL (${lamports.toLocaleString()} lamports) from ${accounts[0] || "?"} to ${accounts[1] || "?"}`;
    }
    const ixNames: Record<number, string> = {
      0: "CreateAccount",
      1: "Assign",
      2: "Transfer",
      3: "CreateAccountWithSeed",
      4: "AdvanceNonceAccount",
      5: "WithdrawNonceAccount",
      6: "InitializeNonceAccount",
      7: "AuthorizeNonceAccount",
      8: "Allocate",
      9: "AllocateWithSeed",
      10: "AssignWithSeed",
      11: "TransferWithSeed",
    };
    return `System Program: ${ixNames[ixType] || `Unknown(${ixType})`}`;
  }

  if (programId === STAKE_PROGRAM_ID && data.length >= 4) {
    const ixType = data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
    const ixNames: Record<number, string> = {
      0: "Initialize",
      1: "Authorize",
      2: "DelegateStake",
      3: "Withdraw",
      4: "Deactivate",
    };

    let detail = "";
    if (ixType === 2) {
      detail = ` (Delegate stake account ${accounts[0] || "?"} to validator ${accounts[1] || "?"})`;
    } else if (ixType === 4) {
      detail = ` (Deactivate stake account ${accounts[0] || "?"})`;
    }

    return `Stake Program: ${ixNames[ixType] || `Unknown(${ixType})`}${detail}`;
  }

  // Unknown program — return raw hex
  return `Data (hex): ${Buffer.from(data).toString("hex")}`;
}

// POST /api/wallet/provider/simulate
// Accepts optional agentId in body to select a specific agent (defaults to main agent)
walletProviderRouter.post(
  "/simulate",
  validateBody(simulateTransactionSchema),
  async (req, res) => {
    try {
      const { transactionMessage, origin, agentId } = req.body;
      const agent = agentId
        ? agentManager.get(agentId)
        : agentManager.getMainAgent();

      if (!agent) {
        res.status(404).json({
          message: agentId
            ? `Agent "${agentId}" not found`
            : "No active agent found",
          data: null,
        });
        return;
      }

      // Security: Sanitize origin string to prevent log injection
      const sanitizedOrigin = (origin || "unknown").replace(/[\r\n]/g, "");

      // Decode the base64 transaction string
      const txBuffer = Buffer.from(transactionMessage, "base64");
      logger.info(
        `[Simulate] Received transaction buffer (${txBuffer.length} bytes) from origin: ${sanitizedOrigin}`,
      );
      let decodedTx: Transaction | VersionedTransaction;
      let instructionsSummary = "";

      try {
        // Try parsing as a VersionedTransaction first, fallback to standard Transaction
        try {
          decodedTx = VersionedTransaction.deserialize(txBuffer);
          const accountKeys = decodedTx.message.staticAccountKeys;
          logger.info(
            `[Simulate] Decoded as VersionedTransaction with ${decodedTx.message.compiledInstructions.length} instruction(s) and ${accountKeys.length} account key(s).`,
          );

          const ixDetails = decodedTx.message.compiledInstructions.map(
            (ix, i) => {
              const programId =
                accountKeys[ix.programIdIndex]?.toBase58() ??
                `Unknown(index=${ix.programIdIndex})`;
              const accounts = ix.accountKeyIndexes.map(
                (idx) =>
                  accountKeys[idx]?.toBase58() ?? `Unknown(index=${idx})`,
              );
              const decoded = decodeInstructionData(
                programId,
                ix.data,
                accounts,
              );
              return `Instruction ${i + 1}:\n  Program: ${programId}\n  Accounts: [${accounts.join(", ")}]\n  ${decoded}`;
            },
          );

          instructionsSummary = `Versioned Transaction with ${decodedTx.message.compiledInstructions.length} instruction(s):\n\n${ixDetails.join("\n\n")}`;
          logger.info(
            `[Simulate] Versioned TX instruction summary:\n${instructionsSummary}`,
          );
        } catch (e) {
          decodedTx = Transaction.from(txBuffer);
          logger.info(
            `[Simulate] Decoded as legacy Transaction with ${decodedTx.instructions.length} instruction(s).`,
          );
          instructionsSummary = decodedTx.instructions
            .map((ix, i) => {
              const programId = ix.programId.toBase58();
              const accounts = ix.keys.map((k) => k.pubkey.toBase58());
              const decoded = decodeInstructionData(
                programId,
                ix.data,
                accounts,
              );
              return `Instruction ${i + 1}:\n  Program: ${programId}\n  Accounts: [${ix.keys.map((k) => `${k.pubkey.toBase58()} (signer=${k.isSigner}, writable=${k.isWritable})`).join(", ")}]\n  ${decoded}`;
            })
            .join("\n\n");
          logger.info(
            `[Simulate] Legacy TX instruction summary:\n${instructionsSummary}`,
          );
        }
      } catch (e) {
        logger.error(`[Simulate] Failed to decode transaction buffer`, {
          error: e,
        });
        const errMsg = e instanceof Error ? e.message : String(e);
        return res.status(400).json({
          message: "Failed to decode transaction buffer: " + errMsg,
          data: null,
        });
      }

      logger.info(
        `[Simulate] Passing transaction to Agent '${agent.name}' for risk analysis...`,
      );

      // Concise advisory-only prompt — formatted for clean chat display
      const prompt = `Analyze this Solana transaction from ${origin}:

${instructionsSummary}

Be concise. State what the transaction does in plain language, flag any concerns, and classify risk.
Format: a short summary sentence, then "Risk: LOW", "MEDIUM", or "HIGH" on its own line at the end.`;

      let agentAnalysis = "Analysis failed.";
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "HIGH";

      try {
        logger.info(`[Simulate] Running tool-free analysis...`);
        const text = await agentManager.analyze(prompt);
        logger.info(
          `[Simulate] Agent raw response (${text.length} chars): ${text.substring(0, 200)}...`,
        );

        // Extract the risk level classification (case-insensitive)
        const upperText = text.toUpperCase();
        if (upperText.includes("RISK: LOW")) {
          riskLevel = "LOW";
        } else if (upperText.includes("RISK: MEDIUM")) {
          riskLevel = "MEDIUM";
        } else if (upperText.includes("RISK: HIGH")) {
          riskLevel = "HIGH";
        } else {
          riskLevel = "HIGH";
        }

        // Clean the analysis text: remove the risk classification line
        agentAnalysis = text
          .replace(/\n?Risk:\s*(LOW|MEDIUM|HIGH)/i, "")
          .trim();
        if (!agentAnalysis) {
          agentAnalysis = "(No additional analysis provided.)";
        }
      } catch (e) {
        logger.error(`[Simulate] Agent evaluation failed`, { error: e });
        const errMsg = e instanceof Error ? e.message : String(e);
        agentAnalysis = `Agent failed to analyze transaction: ${errMsg}`;
      }

      logger.info(`[Simulate] Evaluation complete. Risk: ${riskLevel}`);

      res.json({
        analysis: agentAnalysis,
        riskLevel,
      });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : String(err),
        data: null,
      });
    }
  },
);

// POST /api/wallet/provider/sign
// Accepts optional agentId in body to select a specific agent (defaults to main agent)
walletProviderRouter.post(
  "/sign",
  validateBody(signTransactionSchema),
  async (req, res) => {
    try {
      const { transactionMessage, agentId } = req.body;
      const agent = agentId
        ? agentManager.get(agentId)
        : agentManager.getMainAgent();

      if (!agent) {
        res.status(404).json({
          message: agentId
            ? `Agent "${agentId}" not found`
            : "No active agent found",
          data: null,
        });
        return;
      }

      // Security: Verify agent exists and is accessible (all local agents are accessible)
      // In a multi-user system, you'd check if the authenticated user owns this agent
      if (!agent.pubkey) {
        res.status(400).json({
          message: "Agent has no wallet configured",
          data: null,
        });
        return;
      }

      logger.info(
        `[Sign] Received request to physically sign transaction by Agent '${agent.name}' (id: ${agentId || "main"}, pubkey: ${agent.pubkey})`,
      );

      const txBuffer = Buffer.from(transactionMessage, "base64");
      logger.info(`[Sign] Transaction buffer size: ${txBuffer.length} bytes`);
      let decodedTx: Transaction | VersionedTransaction;
      let finalTransactionBase64 = transactionMessage;
      let txType = "unknown";

      try {
        const keypair = await getKeypair(agent.name);
        logger.info(
          `[Sign] Successfully retrieved private key for agent '${agent.name}' (pubkey: ${keypair.publicKey.toBase58()})`,
        );

        try {
          decodedTx = VersionedTransaction.deserialize(txBuffer);
          txType = "versioned";
          logger.info(`[Sign] Decoded as VersionedTransaction.`);
          logger.info(
            `[Sign] Transaction message signers:`,
            decodedTx.message.staticAccountKeys.map((k) => k.toBase58()),
          );
          logger.info(
            `[Sign] Signing with keypair:`,
            keypair.publicKey.toBase58(),
          );
          decodedTx.sign([keypair]);
          finalTransactionBase64 = Buffer.from(decodedTx.serialize()).toString(
            "base64",
          );
        } catch (e) {
          decodedTx = Transaction.from(txBuffer);
          txType = "legacy";
          logger.info(`[Sign] Decoded as legacy Transaction.`);
          logger.info(
            `[Sign] Transaction feePayer:`,
            decodedTx.feePayer?.toBase58(),
          );
          logger.info(
            `[Sign] Transaction signatures needed for:`,
            decodedTx.signatures.map((s) => s.publicKey.toBase58()),
          );
          logger.info(
            `[Sign] Signing with keypair:`,
            keypair.publicKey.toBase58(),
          );
          decodedTx.partialSign(keypair);
          finalTransactionBase64 = Buffer.from(
            decodedTx.serialize({ requireAllSignatures: false }),
          ).toString("base64");
        }
        logger.info(
          `[Sign] Transaction (${txType}) successfully signed by '${agent.name}'. Signed payload size: ${finalTransactionBase64.length} chars base64.`,
        );
      } catch (e) {
        logger.error(`[Sign] Signing failed`, { error: e });
        const errMsg = e instanceof Error ? e.message : String(e);
        return res.status(500).json({
          message: "Failed to sign transaction physically: " + errMsg,
          data: null,
        });
      }

      res.json({
        message: "Success",
        data: {
          signedTransaction: finalTransactionBase64,
        },
      });
    } catch (err) {
      res.status(500).json({
        message: err instanceof Error ? err.message : String(err),
        data: null,
      });
    }
  },
);
