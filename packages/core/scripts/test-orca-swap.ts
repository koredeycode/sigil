/**
 * Test script for Orca Whirlpools swap on Solana devnet
 *
 * This script:
 * 1. Checks which Orca pools exist on devnet
 * 2. Tests the swap functionality if a pool is available
 * 3. Provides diagnostic information
 *
 * Usage: tsx scripts/test-orca-swap.ts
 */

import { AnchorProvider } from "@coral-xyz/anchor";
import {
  buildWhirlpoolClient,
  PDAUtil,
  WhirlpoolContext,
} from "@orca-so/whirlpools-sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { buildOrcaSwap, DEVNET_TOKENS } from "../src/wallet/OrcaSwap.js";

const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey(
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
);
const DEVNET_WHIRLPOOL_CONFIG = new PublicKey(
  "FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR",
);

// Common token pairs to check on devnet
const TOKEN_PAIRS_TO_CHECK = [
  {
    name: "SOL/devUSDC",
    tokenA: DEVNET_TOKENS.SOL,
    tokenB: DEVNET_TOKENS.USDC,
  },
  {
    name: "SOL/USDC",
    tokenA: DEVNET_TOKENS.SOL,
    tokenB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  {
    name: "SOL/USDT",
    tokenA: DEVNET_TOKENS.SOL,
    tokenB: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
];

const TICK_SPACINGS = [1, 8, 64, 128];

async function checkOrcaPoolsOnDevnet() {
  console.log("🔍 Checking Orca Whirlpools on Solana Devnet...\n");

  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed",
  );
  const wallet = Keypair.generate(); // Dummy wallet for checking

  const provider = new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs,
    } as any,
    { commitment: "confirmed" },
  );

  const ctx = WhirlpoolContext.withProvider(
    provider,
    ORCA_WHIRLPOOL_PROGRAM_ID,
  );
  const client = buildWhirlpoolClient(ctx);

  const availablePools: Array<{
    pair: string;
    address: string;
    tickSpacing: number;
    tokenA: string;
    tokenB: string;
  }> = [];

  for (const pair of TOKEN_PAIRS_TO_CHECK) {
    console.log(`\n📊 Checking ${pair.name}...`);
    console.log(`   Token A: ${pair.tokenA}`);
    console.log(`   Token B: ${pair.tokenB}`);

    for (const tickSpacing of TICK_SPACINGS) {
      try {
        const pda = PDAUtil.getWhirlpool(
          ORCA_WHIRLPOOL_PROGRAM_ID,
          DEVNET_WHIRLPOOL_CONFIG,
          new PublicKey(pair.tokenA),
          new PublicKey(pair.tokenB),
          tickSpacing,
        );

        const poolData = await ctx.fetcher.getPool(pda.publicKey);

        if (poolData) {
          console.log(`   ✅ Found pool with tick spacing ${tickSpacing}`);
          console.log(`      Address: ${pda.publicKey.toBase58()}`);

          availablePools.push({
            pair: pair.name,
            address: pda.publicKey.toBase58(),
            tickSpacing,
            tokenA: pair.tokenA,
            tokenB: pair.tokenB,
          });

          // Get pool details
          try {
            const pool = await client.getPool(pda.publicKey);
            const poolInfo = pool.getData();
            console.log(
              `      Token Vault A: ${poolInfo.tokenVaultA.toBase58()}`,
            );
            console.log(
              `      Token Vault B: ${poolInfo.tokenVaultB.toBase58()}`,
            );
            console.log(`      Liquidity: ${poolInfo.liquidity.toString()}`);
          } catch (err) {
            console.log(`      ⚠️  Could not fetch pool details`);
          }
        }
      } catch (error) {
        // Pool doesn't exist for this tick spacing, continue
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📋 SUMMARY\n");

  if (availablePools.length === 0) {
    console.log(
      "❌ No Orca Whirlpool pools found on devnet for the checked pairs.",
    );
    console.log("\nThis means:");
    console.log("  - The SOL/devUSDC pool does not exist yet on Orca devnet");
    console.log("  - You cannot perform swaps until pools are created");
    console.log("\nOptions:");
    console.log("  1. Create a pool on Orca devnet (requires liquidity)");
    console.log("  2. Use a different DEX that has devnet pools");
    console.log("  3. Switch to mainnet for swaps (requires real SOL)");
    console.log("  4. Mock the swap functionality for testing");
  } else {
    console.log(`✅ Found ${availablePools.length} pool(s) on Orca devnet:\n`);

    availablePools.forEach((pool, i) => {
      console.log(`${i + 1}. ${pool.pair}`);
      console.log(`   Address: ${pool.address}`);
      console.log(`   Tick Spacing: ${pool.tickSpacing}`);
      console.log("");
    });
  }

  return availablePools;
}

async function testSwapFunctionality(
  pools: Array<{ tokenA: string; tokenB: string; pair: string }>,
) {
  if (pools.length === 0) {
    console.log("\n⚠️  Skipping swap test - no pools available");
    return;
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n🧪 Testing Swap Functionality\n");

  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed",
  );
  const testWallet = Keypair.generate();

  console.log(`Test wallet: ${testWallet.publicKey.toBase58()}`);
  console.log(
    "\nNote: This is a dry-run test (building transaction only, not submitting)\n",
  );

  for (const pool of pools.slice(0, 1)) {
    // Test only first available pool
    try {
      console.log(`Testing ${pool.pair} swap...`);
      console.log(`  Input: 0.1 SOL`);
      console.log(
        `  Output: Expected in ${pool.tokenB === DEVNET_TOKENS.USDC ? "USDC" : "other token"}`,
      );

      const result = await buildOrcaSwap(
        connection,
        testWallet,
        pool.tokenA,
        pool.tokenB,
        0.1, // 0.1 SOL
        100, // 1% slippage
      );

      const outputDecimals = pool.tokenB === DEVNET_TOKENS.USDC ? 6 : 9;
      const estimatedOut =
        Number(result.estimatedAmountOut) / 10 ** outputDecimals;

      console.log(`  ✅ Transaction built successfully!`);
      console.log(`  Estimated output: ${estimatedOut.toFixed(6)} tokens`);
      console.log(
        `  Estimated fee: ${Number(result.estimatedFeeAmount) / 1e9} SOL`,
      );
      console.log(
        `  Transaction has ${result.transaction.instructions.length} instruction(s)`,
      );
    } catch (error) {
      console.log(`  ❌ Swap test failed:`);
      console.log(
        `     ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

async function checkOrcaAPI() {
  console.log("\n" + "=".repeat(60));
  console.log("\n🌐 Checking Orca API for devnet pools...\n");

  try {
    // Try the Orca API endpoint for devnet pools
    const response = await fetch(
      "https://api.orca.so/v1/whirlpool/list?network=devnet",
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Orca API response:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`⚠️  Orca API returned status: ${response.status}`);
      console.log("   This endpoint might not support devnet queries");
    }
  } catch (error) {
    console.log("❌ Could not fetch from Orca API:");
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Main execution
async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       Orca Whirlpools Devnet Pool & Swap Tester           ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n",
  );

  try {
    // Check which pools exist
    const availablePools = await checkOrcaPoolsOnDevnet();

    // Check Orca API
    await checkOrcaAPI();

    // Test swap functionality if pools exist
    await testSwapFunctionality(availablePools);

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Test complete!\n");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    process.exit(1);
  }
}

main();
