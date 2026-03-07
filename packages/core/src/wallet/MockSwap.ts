import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { logger } from "../lib/Logger.js";

export const DEVNET_TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt", // devUSDC
};

interface MockSwapQuote {
  estimatedAmountOut: bigint;
  estimatedAmountIn: bigint;
  estimatedFeeAmount: bigint;
  transaction: Transaction;
}

/**
 * Mock swap implementation for testing on devnet when no real pools exist.
 *
 * This creates a dummy transaction that simulates a swap without actually
 * exchanging tokens. Useful for testing agent behavior and guardrails.
 *
 * @param connection Solana connection
 * @param wallet User's keypair
 * @param inputMint Input token mint address
 * @param outputMint Output token mint address
 * @param amount Amount of input token (in UI units)
 * @param slippageBps Slippage tolerance in basis points (not used in mock)
 * @returns Mock swap quote with dummy transaction
 */
export async function buildMockSwap(
  connection: Connection,
  wallet: Keypair,
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number,
): Promise<MockSwapQuote> {
  try {
    logger.debug(
      `[MockSwap] Building mock swap: ${amount} ${inputMint} -> ${outputMint}`,
    );

    // Validate token pair
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
        `Mock swap only supports SOL/USDC pairs. Got: ${inputMint} -> ${outputMint}`,
      );
    }

    // Mock exchange rates (approximate mainnet rates)
    const SOL_TO_USDC_RATE = 150; // ~$150 per SOL
    const USDC_TO_SOL_RATE = 1 / SOL_TO_USDC_RATE;

    // Calculate output based on mock exchange rate
    let estimatedOut: number;
    let inputDecimals: number;
    let outputDecimals: number;

    if (inputMint === DEVNET_TOKENS.SOL) {
      // SOL -> USDC
      estimatedOut = amount * SOL_TO_USDC_RATE;
      inputDecimals = 9;
      outputDecimals = 6;
    } else {
      // USDC -> SOL
      estimatedOut = amount * USDC_TO_SOL_RATE;
      inputDecimals = 6;
      outputDecimals = 9;
    }

    // Apply slippage (reduce output by slippage percentage)
    const slippageMultiplier = 1 - slippageBps / 10000;
    estimatedOut = estimatedOut * slippageMultiplier;

    // Create a dummy transaction (just transfers 1 lamport to self)
    // This allows the transaction to go through guardrails and be "confirmed"
    const tx = new Transaction();

    // Add a memo to indicate this is a mock swap
    const memoInstruction = {
      keys: [],
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(
        `MOCK_SWAP:${amount}:${inputMint.slice(0, 8)}:${outputMint.slice(0, 8)}`,
      ),
    };
    tx.add(memoInstruction);

    // Add minimal SOL transfer to make it a valid transaction
    tx.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: 1,
      }),
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;

    logger.debug(
      `[MockSwap] Mock swap built: ${amount} -> ${estimatedOut.toFixed(6)}`,
    );

    return {
      estimatedAmountOut: BigInt(
        Math.round(estimatedOut * Math.pow(10, outputDecimals)),
      ),
      estimatedAmountIn: BigInt(
        Math.round(amount * Math.pow(10, inputDecimals)),
      ),
      estimatedFeeAmount: BigInt(5000), // 0.000005 SOL mock fee
      transaction: tx,
    };
  } catch (error) {
    logger.error("[MockSwap] Error building mock swap:", error);
    throw error;
  }
}

/**
 * Check if a token pair is valid for mock swaps
 */
export function isValidMockSwapPair(
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
