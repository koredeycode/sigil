import { AnchorProvider } from "@coral-xyz/anchor";
import { Percentage } from "@orca-so/common-sdk";
import {
  PDAUtil,
  WhirlpoolContext,
  buildWhirlpoolClient,
  swapQuoteByInputToken,
} from "@orca-so/whirlpools-sdk";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { logger } from "../lib/Logger.js";

// Orca Whirlpool Program ID (same for devnet and mainnet)
const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey(
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
);

// Devnet token addresses
export const DEVNET_TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt", // devUSDC
};

// Known Orca whirlpool configs for devnet
const DEVNET_WHIRLPOOL_CONFIG = new PublicKey(
  "FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR",
); // Orca's devnet config

interface SwapQuote {
  estimatedAmountOut: bigint;
  estimatedAmountIn: bigint;
  estimatedFeeAmount: bigint;
  transaction: Transaction;
}

/**
 * Build a swap transaction for SOL <-> devUSDC on Orca Whirlpool devnet.
 * @param connection Solana connection
 * @param wallet User's keypair
 * @param inputMint Input token mint address
 * @param outputMint Output token mint address
 * @param amount Amount of input token (in UI units)
 * @param slippageBps Slippage tolerance in basis points
 * @returns Swap quote with transaction
 */
export async function buildOrcaSwap(
  connection: Connection,
  wallet: Keypair,
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number,
): Promise<SwapQuote> {
  try {
    logger.debug(
      `[OrcaSwap] Building swap: ${amount} ${inputMint} -> ${outputMint}`,
    );

    // Validate token pair (only SOL/USDC supported)
    const validPairs = [
      [DEVNET_TOKENS.SOL, DEVNET_TOKENS.USDC],
      [DEVNET_TOKENS.USDC, DEVNET_TOKENS.SOL],
    ];

    const isValidPair = validPairs.some(
      ([a, b]) =>
        (inputMint === a && outputMint === b) ||
        (inputMint === b && outputMint === a),
    );

    if (!isValidPair) {
      throw new Error(
        `Only SOL/devUSDC swaps are supported on devnet. Got: ${inputMint} -> ${outputMint}`,
      );
    }

    // Create Anchor Provider for Orca SDK
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: async (tx: Transaction) => {
          tx.sign(wallet);
          return tx;
        },
        signAllTransactions: async (txs: Transaction[]) => {
          return txs.map((tx: Transaction) => {
            tx.sign(wallet);
            return tx;
          });
        },
      } as any,
      { commitment: "confirmed" },
    );

    // Create Whirlpool context
    const ctx = WhirlpoolContext.withProvider(
      provider,
      ORCA_WHIRLPOOL_PROGRAM_ID,
    );

    const client = buildWhirlpoolClient(ctx);

    // Get token mints
    const inputMintPubkey = new PublicKey(inputMint);
    const outputMintPubkey = new PublicKey(outputMint);

    // Find the SOL/USDC whirlpool address
    // Orca uses tick spacing to determine fee tier. Common values: 64, 128
    let whirlpoolPda: PublicKey | null = null;
    const tickSpacings = [64, 128, 8]; // Try common tick spacings

    for (const tickSpacing of tickSpacings) {
      const pda = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        DEVNET_WHIRLPOOL_CONFIG,
        inputMintPubkey,
        outputMintPubkey,
        tickSpacing,
      );

      try {
        const poolData = await ctx.fetcher.getPool(pda.publicKey);
        if (poolData) {
          whirlpoolPda = pda.publicKey;
          logger.debug(
            `[OrcaSwap] Found pool at ${whirlpoolPda.toBase58()} with tick spacing ${tickSpacing}`,
          );
          break;
        }
      } catch (e) {
        // Try next tick spacing
        continue;
      }
    }

    if (!whirlpoolPda) {
      throw new Error(
        `No Orca whirlpool found for SOL/devUSDC pair on devnet. The pool may not exist yet.`,
      );
    }

    // Get the whirlpool
    const whirlpool = await client.getPool(whirlpoolPda);

    // Determine input token decimals
    let decimals = 9; // SOL default
    if (inputMint === DEVNET_TOKENS.USDC) {
      decimals = 6; // USDC has 6 decimals
    }

    // Calculate input amount in token's smallest units
    const inputAmountBN = BigInt(Math.round(amount * Math.pow(10, decimals)));

    // Calculate slippage as Percentage
    const slippageTolerance = Percentage.fromFraction(slippageBps, 10000);

    // Get swap quote
    const quote = await swapQuoteByInputToken(
      whirlpool,
      inputMintPubkey,
      inputAmountBN,
      slippageTolerance,
      ORCA_WHIRLPOOL_PROGRAM_ID,
      ctx.fetcher,
      {},
    );

    // Build swap transaction - the quote should contain the necessary instructions
    // Use the swap method from the whirlpool client which returns a TransactionBuilder
    const swapTxBuilder = await whirlpool.swap(quote);

    // Build the actual transaction from the builder
    const latestBlockhash = await connection.getLatestBlockhash();
    const txPayload = swapTxBuilder.buildSync({
      latestBlockhash,
      blockhashCommitment: "confirmed",
      maxSupportedTransactionVersion: 0,
      computeBudgetOption: { type: "none" },
    });

    // Ensure we have a legacy Transaction (not VersionedTransaction)
    if (!("instructions" in txPayload.transaction)) {
      throw new Error(
        "Orca swap returned a VersionedTransaction, but legacy Transaction is required",
      );
    }

    return {
      estimatedAmountOut: quote.estimatedAmountOut,
      estimatedAmountIn: quote.estimatedAmountIn,
      estimatedFeeAmount: quote.estimatedFeeAmount,
      transaction: txPayload.transaction as Transaction,
    };
  } catch (error) {
    logger.error("[OrcaSwap] Error building swap:", error);
    throw error;
  }
}

/**
 * Check if a token pair is valid for devnet swaps
 */
export function isValidDevnetSwapPair(
  inputMint: string,
  outputMint: string,
): boolean {
  const validPairs = [
    [DEVNET_TOKENS.SOL, DEVNET_TOKENS.USDC],
    [DEVNET_TOKENS.USDC, DEVNET_TOKENS.SOL],
  ];

  return validPairs.some(
    ([a, b]) =>
      (inputMint === a && outputMint === b) ||
      (inputMint === b && outputMint === a),
  );
}
