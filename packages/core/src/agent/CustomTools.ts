import { DynamicStructuredTool } from '@langchain/core/tools';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { logger } from '../lib/Logger.js';
import { requestAirdrop, signAndSubmit } from '../wallet/Signer.js';
import {
  buildBurnTokens,
  buildCloseEmptyAccounts,
  buildCreateToken,
  buildDeactivateStake,
  buildMemoTransaction,
  buildMintTokens,
  buildStakeSol,
  buildTransferSol,
  buildTransferToken,
  getConnection,
  lamportsToSol,
  solToLamports,
} from '../wallet/TransactionBuilder.js';
import { getKeypair } from '../wallet/Wallet.js';

/**
 * Create the full custom toolset (19 tools).
 * All state-changing tools route through signAndSubmit for guardrails enforcement.
 */
export function createCustomTools(agentId: string, agentName: string): DynamicStructuredTool[] {
  const connection = getConnection();

    // ═══════════════════════════════════════════════════════════════════════
  //  WALLET & BALANCE TOOLS
  // ═══════════════════════════════════════════════════════════════════════

  const getBalanceTool = new DynamicStructuredTool({
      name: 'get_balance',
      description: 'Check SOL balance and all SPL token holdings for this agent\'s wallet.',
      schema: z.object({}),
      func: async () => {
        try {
          logger.debug(`[Tool:get_balance] Starting for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const balance = await connection.getBalance(keypair.publicKey);
          const solBalance = lamportsToSol(balance);

          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            keypair.publicKey,
            { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
          );

          const tokens = tokenAccounts.value.map((ta) => {
            const info = ta.account.data.parsed.info;
            return {
              mint: info.mint,
              balance: info.tokenAmount.uiAmount,
              decimals: info.tokenAmount.decimals,
            };
          });

          return JSON.stringify({ sol: solBalance, tokens }, null, 2);
        } catch (error) {
          return `Error getting balance: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const requestAirdropTool = new DynamicStructuredTool({
      name: 'request_airdrop',
      description: 'Request SOL from the devnet faucet. Maximum 2 SOL per request.',
      schema: z.object({
        amount: z.number().min(0.1).max(2).describe('Amount of SOL to request (max 2)'),
      }),
      func: async ({ amount }) => {
        try {
          logger.debug(`[Tool:request_airdrop] Requesting ${amount} SOL for ${agentName}`);
          const lamports = solToLamports(amount);
          const result = await requestAirdrop(agentName, agentId, lamports);
          if (result.status === 'confirmed') {
            return `✔ Airdrop ${amount} SOL confirmed. Tx: ${result.signature}`;
          }
          return `✘ Airdrop failed: ${result.error}`;
        } catch (error) {
          return `Error requesting airdrop: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const transferSolTool = new DynamicStructuredTool({
      name: 'transfer_sol',
      description: 'Send SOL to an address. Subject to guardrails.',
      schema: z.object({
        to: z.string().describe('Recipient Solana address (base58)'),
        amount: z.number().positive().describe('Amount of SOL to send'),
      }),
      func: async ({ to, amount }) => {
        try {
          logger.debug(`[Tool:transfer_sol] Transferring ${amount} SOL to ${to} for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const recipient = new PublicKey(to);
          const lamports = solToLamports(amount);
          const tx = buildTransferSol(keypair.publicKey, recipient, lamports);

          const result = await signAndSubmit(agentName, tx, agentId, 'transfer', {
            token: 'SOL',
            amount,
            recipient: to,
          });

          if (result.status === 'confirmed') {
            return `✔ Sent ${amount} SOL to ${to}. Tx: ${result.signature}`;
          }
          return `✘ Transfer failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const getTransactionHistoryTool = new DynamicStructuredTool({
      name: 'get_transaction_history',
      description: 'Fetch recent on-chain transactions for this wallet.',
      schema: z.object({
        limit: z.number().optional().default(10).describe('Number of transactions to fetch'),
      }),
      func: async ({ limit }) => {
        try {
          const keypair = await getKeypair(agentName);
          const signatures = await connection.getSignaturesForAddress(
            keypair.publicKey,
            { limit }
          );
          const txs = signatures.map((s) => ({
            signature: s.signature,
            blockTime: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
            status: s.confirmationStatus,
            err: s.err,
          }));
          return JSON.stringify(txs, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const getTokenAccountsTool = new DynamicStructuredTool({
      name: 'get_token_accounts',
      description: 'List all SPL token accounts owned by this wallet.',
      schema: z.object({}),
      func: async () => {
        try {
          logger.debug(`[Tool:get_token_accounts] Fetching for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            keypair.publicKey,
            { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
          );

          const accounts = tokenAccounts.value.map((ta) => {
            const info = ta.account.data.parsed.info;
            return {
              address: ta.pubkey.toBase58(),
              mint: info.mint,
              balance: info.tokenAmount.uiAmount,
              decimals: info.tokenAmount.decimals,
            };
          });

          return JSON.stringify(accounts, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const getPortfolioSnapshotTool = new DynamicStructuredTool({
      name: 'get_portfolio_snapshot',
      description: 'Get a full breakdown of holdings with percentages of total portfolio.',
      schema: z.object({}),
      func: async () => {
        try {
          logger.debug(`[Tool:get_portfolio_snapshot] Fetching for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const balance = await connection.getBalance(keypair.publicKey);
          const solBalance = lamportsToSol(balance);

          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            keypair.publicKey,
            { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
          );

          const totalValue = solBalance; 

          const holdings = [
            {
              token: 'SOL',
              balance: solBalance,
              percentage: totalValue > 0 ? (solBalance / totalValue) * 100 : 100,
            },
            ...tokenAccounts.value.map((ta) => {
              const info = ta.account.data.parsed.info;
              return {
                token: info.mint,
                balance: info.tokenAmount.uiAmount,
                percentage: 0,
              };
            }),
          ];

          return JSON.stringify({
            totalValue: `${totalValue} SOL`,
            holdings,
          }, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const getAccountInfoTool = new DynamicStructuredTool({
      name: 'get_account_info',
      description: 'Fetch on-chain account metadata for any Solana address.',
      schema: z.object({
        address: z.string().describe('Solana address to query (base58)'),
      }),
      func: async ({ address }) => {
        try {
          logger.debug(`[Tool:get_account_info] Fetching info for ${address}`);
          const pubkey = new PublicKey(address);
          const info = await connection.getAccountInfo(pubkey);
          if (!info) return `Account ${address} not found on-chain.`;

          return JSON.stringify({
            owner: info.owner.toBase58(),
            lamports: info.lamports,
            sol: lamportsToSol(info.lamports),
            dataSize: info.data.length,
            executable: info.executable,
          }, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  // ═══════════════════════════════════════════════════════════════════════
  //  STAKING TOOLS
  // ═══════════════════════════════════════════════════════════════════════

  const stakeSolTool = new DynamicStructuredTool({
      name: 'stake_sol',
      description: 'Delegate SOL to a validator on devnet. Creates a stake account and delegates. Subject to guardrails.',
      schema: z.object({
        amount: z.number().positive().describe('Amount of SOL to stake'),
        validatorAddress: z.string().describe('Validator vote account address (base58)'),
      }),
      func: async ({ amount, validatorAddress }) => {
        try {
          logger.debug(`[Tool:stake_sol] Staking ${amount} SOL to ${validatorAddress} for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const lamports = solToLamports(amount);
          const validatorPubkey = new PublicKey(validatorAddress);

          const { transaction, stakeKeypair } = buildStakeSol(keypair.publicKey, lamports, validatorPubkey);

          const result = await signAndSubmit(agentName, transaction, agentId, 'stake', {
            token: 'SOL',
            amount,
          }, [stakeKeypair]);

          if (result.status === 'confirmed') {
            return `✔ Staked ${amount} SOL to validator ${validatorAddress}. Stake account: ${stakeKeypair.publicKey.toBase58()}. Tx: ${result.signature}`;
          }
          return `✘ Stake failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const deactivateStakeTool = new DynamicStructuredTool({
      name: 'deactivate_stake',
      description: 'Deactivate a stake account so it can be withdrawn after the cool-down epoch.',
      schema: z.object({
        stakeAccountAddress: z.string().describe('Stake account address to deactivate (base58)'),
      }),
      func: async ({ stakeAccountAddress }) => {
        try {
          logger.debug(`[Tool:deactivate_stake] Deactivating ${stakeAccountAddress} for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const stakeAccount = new PublicKey(stakeAccountAddress);
          const tx = buildDeactivateStake(keypair.publicKey, stakeAccount);

          const result = await signAndSubmit(agentName, tx, agentId, 'stake', {
            token: 'SOL',
          });

          if (result.status === 'confirmed') {
            return `✔ Stake account ${stakeAccountAddress} deactivated. Tx: ${result.signature}`;
          }
          return `✘ Deactivation failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  // ═══════════════════════════════════════════════════════════════════════
  //  SPL TOKEN TOOLS
  // ═══════════════════════════════════════════════════════════════════════

  const createTokenTool = new DynamicStructuredTool({
      name: 'create_token',
      description: 'Create a new SPL token mint on devnet with optional metadata (name, symbol, image URI). You become the mint authority. Subject to guardrails.',
      schema: z.object({
        decimals: z.number().int().min(0).max(9).default(9).describe('Token decimals (0-9, default 9)'),
        name: z.string().max(32).optional().describe('Token name (e.g., "Sigil Test Token")'),
        symbol: z.string().max(10).optional().describe('Token symbol/ticker (e.g., "SGT")'),
        uri: z.string().optional().describe('Metadata URI pointing to a JSON file with image/description (optional)'),
      }),
      func: async ({ decimals, name, symbol, uri }) => {
        try {
          logger.debug(`[Tool:create_token] Creating token with ${decimals} decimals for ${agentName}`);
          const keypair = await getKeypair(agentName);

          // Build metadata if name and symbol are provided
          const metadata = name && symbol ? { name, symbol, uri } : undefined;
          const { transaction, mintKeypair } = await buildCreateToken(keypair.publicKey, decimals, connection, metadata);

          const result = await signAndSubmit(agentName, transaction, agentId, 'create_token', {
            token: mintKeypair.publicKey.toBase58(),
          }, [mintKeypair]);

          if (result.status === 'confirmed') {
            const metaStr = metadata ? ` Name: ${name}, Symbol: ${symbol}.` : '';
            return `✔ Token created! Mint address: ${mintKeypair.publicKey.toBase58()}. Decimals: ${decimals}.${metaStr} Tx: ${result.signature}`;
          }
          return `✘ Token creation failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const mintTokensTool = new DynamicStructuredTool({
      name: 'mint_tokens',
      description: 'Mint SPL tokens to this wallet. You must be the mint authority. Subject to guardrails.',
      schema: z.object({
        mintAddress: z.string().describe('Token mint address (base58)'),
        amount: z.number().positive().describe('Amount of tokens to mint (in UI units, e.g., 100.5)'),
      }),
      func: async ({ mintAddress, amount }) => {
        try {
          logger.debug(`[Tool:mint_tokens] Minting ${amount} of ${mintAddress} for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const mint = new PublicKey(mintAddress);

          // Get mint info to determine decimals
          const mintInfo = await connection.getParsedAccountInfo(mint);
          const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals ?? 9;
          const rawAmount = BigInt(Math.round(amount * 10 ** decimals));

          const tx = await buildMintTokens(keypair.publicKey, mint, rawAmount, connection);

          const result = await signAndSubmit(agentName, tx, agentId, 'mint', {
            token: mintAddress,
            amount,
          });

          if (result.status === 'confirmed') {
            return `✔ Minted ${amount} tokens (${mintAddress}). Tx: ${result.signature}`;
          }
          return `✘ Mint failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const burnTokensTool = new DynamicStructuredTool({
      name: 'burn_tokens',
      description: 'Burn SPL tokens from this wallet. Subject to guardrails.',
      schema: z.object({
        mintAddress: z.string().describe('Token mint address (base58)'),
        amount: z.number().positive().describe('Amount of tokens to burn (in UI units)'),
      }),
      func: async ({ mintAddress, amount }) => {
        try {
          logger.debug(`[Tool:burn_tokens] Burning ${amount} of ${mintAddress} for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const mint = new PublicKey(mintAddress);

          const mintInfo = await connection.getParsedAccountInfo(mint);
          const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals ?? 9;
          const rawAmount = BigInt(Math.round(amount * 10 ** decimals));

          const tx = buildBurnTokens(keypair.publicKey, mint, rawAmount);

          const result = await signAndSubmit(agentName, tx, agentId, 'burn', {
            token: mintAddress,
            amount,
          });

          if (result.status === 'confirmed') {
            return `✔ Burned ${amount} tokens (${mintAddress}). Tx: ${result.signature}`;
          }
          return `✘ Burn failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const transferTokenTool = new DynamicStructuredTool({
      name: 'transfer_token',
      description: 'Send SPL tokens to another address. Creates the recipient\'s token account if needed. Subject to guardrails.',
      schema: z.object({
        mintAddress: z.string().describe('Token mint address (base58)'),
        to: z.string().describe('Recipient Solana address (base58)'),
        amount: z.number().positive().describe('Amount of tokens to send (in UI units)'),
      }),
      func: async ({ mintAddress, to, amount }) => {
        try {
          logger.debug(`[Tool:transfer_token] Sending ${amount} of ${mintAddress} to ${to} for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const mint = new PublicKey(mintAddress);
          const recipient = new PublicKey(to);

          const mintInfo = await connection.getParsedAccountInfo(mint);
          const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals ?? 9;
          const rawAmount = BigInt(Math.round(amount * 10 ** decimals));

          const tx = await buildTransferToken(keypair.publicKey, recipient, mint, rawAmount, connection);

          const result = await signAndSubmit(agentName, tx, agentId, 'transfer', {
            token: mintAddress,
            amount,
            recipient: to,
          });

          if (result.status === 'confirmed') {
            return `✔ Sent ${amount} tokens (${mintAddress}) to ${to}. Tx: ${result.signature}`;
          }
          return `✘ Transfer failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const closeEmptyTokenAccountsTool = new DynamicStructuredTool({
      name: 'close_empty_token_accounts',
      description: 'Close all zero-balance SPL token accounts to reclaim rent SOL. Subject to guardrails.',
      schema: z.object({}),
      func: async () => {
        try {
          logger.debug(`[Tool:close_empty_token_accounts] Scanning for ${agentName}`);
          const keypair = await getKeypair(agentName);

          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            keypair.publicKey,
            { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
          );

          const emptyAccounts = tokenAccounts.value
            .filter((ta) => ta.account.data.parsed.info.tokenAmount.uiAmount === 0)
            .map((ta) => ta.pubkey);

          if (emptyAccounts.length === 0) {
            return 'No empty token accounts to close.';
          }

          const tx = buildCloseEmptyAccounts(keypair.publicKey, emptyAccounts);

          const result = await signAndSubmit(agentName, tx, agentId, 'close_account', {
            token: 'SOL',
          });

          if (result.status === 'confirmed') {
            return `✔ Closed ${emptyAccounts.length} empty token account(s). Rent reclaimed. Tx: ${result.signature}`;
          }
          return `✘ Close failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  // ═══════════════════════════════════════════════════════════════════════
  //  SWAP TOOL (Jupiter API)
  // ═══════════════════════════════════════════════════════════════════════

  const swapTokensTool = new DynamicStructuredTool({
      name: 'swap_tokens',
      description: 'Swap tokens using the Jupiter aggregator on devnet. Input/output are token mint addresses. Use "So11111111111111111111111111111111111111112" for native SOL. Subject to guardrails.',
      schema: z.object({
        inputMint: z.string().describe('Input token mint address (base58). Use So11111111111111111111111111111111111111112 for SOL'),
        outputMint: z.string().describe('Output token mint address (base58)'),
        amount: z.number().positive().describe('Amount of input token to swap (in UI units)'),
        slippageBps: z.number().int().min(1).max(5000).default(50).describe('Slippage tolerance in basis points (default 50 = 0.5%)'),
      }),
      func: async ({ inputMint, outputMint, amount, slippageBps }) => {
        try {
          logger.debug(`[Tool:swap_tokens] Swapping ${amount} ${inputMint} -> ${outputMint} for ${agentName}`);
          const keypair = await getKeypair(agentName);

          // Determine decimals for the input token
          let decimals = 9; // SOL default
          if (inputMint !== 'So11111111111111111111111111111111111111112') {
            const mintInfo = await connection.getParsedAccountInfo(new PublicKey(inputMint));
            decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals ?? 9;
          }
          const rawAmount = Math.round(amount * 10 ** decimals);

          // 1. Get quote from Jupiter
          const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmount}&slippageBps=${slippageBps}`;
          const quoteRes = await fetch(quoteUrl);
          if (!quoteRes.ok) {
            return `✘ Jupiter quote failed: ${quoteRes.statusText}`;
          }
          const quoteData = await quoteRes.json();

          // 2. Get swap transaction
          const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quoteResponse: quoteData,
              userPublicKey: keypair.publicKey.toBase58(),
              wrapAndUnwrapSol: true,
            }),
          });
          if (!swapRes.ok) {
            return `✘ Jupiter swap transaction failed: ${swapRes.statusText}`;
          }
          const swapData = await swapRes.json();

          // 3. Deserialize and sign via our guardrails pipeline
          const { Transaction: TxClass } = await import('@solana/web3.js');
          const txBuf = Buffer.from(swapData.swapTransaction, 'base64');
          const tx = TxClass.from(txBuf);

          const result = await signAndSubmit(agentName, tx, agentId, 'swap', {
            token: inputMint,
            amount,
          });

          if (result.status === 'confirmed') {
            const outAmount = quoteData.outAmount / 10 ** (quoteData.outputDecimals ?? 9);
            return `✔ Swapped ${amount} ${inputMint} → ${outAmount} ${outputMint}. Tx: ${result.signature}`;
          }
          return `✘ Swap failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  // ═══════════════════════════════════════════════════════════════════════
  //  MEMO TOOL
  // ═══════════════════════════════════════════════════════════════════════

  const sendMemoTool = new DynamicStructuredTool({
      name: 'send_memo',
      description: 'Send an on-chain memo message. Useful for tagging transactions with human-readable notes. Subject to guardrails.',
      schema: z.object({
        message: z.string().max(566).describe('Memo message to write on-chain (max 566 bytes)'),
      }),
      func: async ({ message }) => {
        try {
          logger.debug(`[Tool:send_memo] Writing memo for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const tx = buildMemoTransaction(keypair.publicKey, message);

          const result = await signAndSubmit(agentName, tx, agentId, 'memo', {});

          if (result.status === 'confirmed') {
            return `✔ Memo recorded on-chain: "${message}". Tx: ${result.signature}`;
          }
          return `✘ Memo failed: ${result.error}`;
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  // ═══════════════════════════════════════════════════════════════════════
  //  READ-ONLY DATA TOOLS
  // ═══════════════════════════════════════════════════════════════════════

  const fetchPriceTool = new DynamicStructuredTool({
      name: 'fetch_price',
      description: 'Get the current USD price of a token by its mint address or well-known symbol (SOL, USDC, etc).',
      schema: z.object({
        token: z.string().describe('Token mint address (base58) or symbol like SOL, USDC, BONK'),
      }),
      func: async ({ token }) => {
        try {
          logger.debug(`[Tool:fetch_price] Fetching price for ${token}`);

          // Mainnet mint addresses — used ONLY for Jupiter Price API lookups (which indexes mainnet).
          // These are NOT used for on-chain devnet transactions.
          const symbolMap: Record<string, string> = {
            SOL: 'So11111111111111111111111111111111111111112',
            USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
            BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          };
          const mintAddress = symbolMap[token.toUpperCase()] || token;

          const res = await fetch(`https://api.jup.ag/price/v2?ids=${mintAddress}`);
          if (!res.ok) {
            return `✘ Price fetch failed: ${res.statusText}`;
          }
          const data = await res.json();
          const priceInfo = data.data?.[mintAddress];

          if (!priceInfo) {
            return `No price data found for ${token} (${mintAddress}).`;
          }

          return JSON.stringify({
            token,
            mint: mintAddress,
            priceUsd: priceInfo.price,
          }, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const getTpsTool = new DynamicStructuredTool({
      name: 'get_tps',
      description: 'Get the current transactions-per-second (TPS) on the Solana devnet cluster.',
      schema: z.object({}),
      func: async () => {
        try {
          logger.debug(`[Tool:get_tps] Fetching TPS`);
          const samples = await connection.getRecentPerformanceSamples(1);
          if (samples.length === 0) return 'No performance data available.';

          const sample = samples[0];
          const tps = sample.numTransactions / sample.samplePeriodSecs;

          return JSON.stringify({
            tps: Math.round(tps),
            totalTransactions: sample.numTransactions,
            samplePeriodSecs: sample.samplePeriodSecs,
            slot: sample.slot,
          }, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const getSlotInfoTool = new DynamicStructuredTool({
      name: 'get_slot_info',
      description: 'Get current slot, epoch, and block height information from the Solana devnet cluster.',
      schema: z.object({}),
      func: async () => {
        try {
          logger.debug(`[Tool:get_slot_info] Fetching epoch info`);
          const epochInfo = await connection.getEpochInfo();

          return JSON.stringify({
            slot: epochInfo.absoluteSlot,
            blockHeight: epochInfo.blockHeight,
            epoch: epochInfo.epoch,
            slotIndex: epochInfo.slotIndex,
            slotsInEpoch: epochInfo.slotsInEpoch,
            epochProgress: `${((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(1)}%`,
          }, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  // ═══════════════════════════════════════════════════════════════════════
  //  VALIDATOR & STAKE POSITION TOOLS
  // ═══════════════════════════════════════════════════════════════════════

  const listValidatorsTool = new DynamicStructuredTool({
      name: 'list_validators',
      description: 'List active validators on the Solana devnet cluster with their vote accounts, stake, and commission. Useful for choosing a validator before staking.',
      schema: z.object({
        limit: z.number().int().min(1).max(20).default(10).describe('Number of top validators to return (default 10, max 20)'),
      }),
      func: async ({ limit }) => {
        try {
          logger.debug(`[Tool:list_validators] Fetching top ${limit} validators`);
          const voteAccounts = await connection.getVoteAccounts();

          // Sort by activated stake (highest first)
          const sorted = voteAccounts.current
            .sort((a, b) => b.activatedStake - a.activatedStake)
            .slice(0, limit);

          const validators = sorted.map((v, i) => ({
            rank: i + 1,
            voteAccount: v.votePubkey,
            nodeIdentity: v.nodePubkey,
            activatedStake: lamportsToSol(v.activatedStake),
            commission: `${v.commission}%`,
            lastVote: v.lastVote,
          }));

          return JSON.stringify({
            network: 'devnet',
            totalValidators: voteAccounts.current.length,
            showing: validators.length,
            validators,
          }, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const getStakePositionsTool = new DynamicStructuredTool({
      name: 'get_stake_positions',
      description: 'View all stake accounts owned by this wallet, their status (active/deactivating/inactive), validator, and balance.',
      schema: z.object({}),
      func: async () => {
        try {
          logger.debug(`[Tool:get_stake_positions] Fetching for ${agentName}`);
          const keypair = await getKeypair(agentName);

          // Fetch all stake accounts where this wallet is the staker authority
          const stakeAccounts = await connection.getParsedProgramAccounts(
            new PublicKey('Stake11111111111111111111111111111111111111'),
            {
              filters: [
                { dataSize: 200 }, // stake account data size
                {
                  memcmp: {
                    offset: 12, // authorized staker offset
                    bytes: keypair.publicKey.toBase58(),
                  },
                },
              ],
            }
          );

          if (stakeAccounts.length === 0) {
            return 'No stake accounts found for this wallet.';
          }

          const positions = stakeAccounts.map((account) => {
            const parsed = (account.account.data as any)?.parsed;
            const info = parsed?.info;
            const stake = info?.stake;
            const delegation = stake?.delegation;

            return {
              stakeAccount: account.pubkey.toBase58(),
              status: parsed?.type ?? 'unknown', // 'delegated', 'initialized', etc.
              balance: lamportsToSol(account.account.lamports),
              validator: delegation?.voter ?? 'none',
              activationEpoch: delegation?.activationEpoch ?? null,
              deactivationEpoch: delegation?.deactivationEpoch ?? null,
            };
          });

          return JSON.stringify({
            totalPositions: positions.length,
            positions,
          }, null, 2);
        } catch (error) {
          return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

  const tools: DynamicStructuredTool[] = [
    getBalanceTool,
    requestAirdropTool,
    transferSolTool,
    getTransactionHistoryTool,
    getTokenAccountsTool,
    getPortfolioSnapshotTool,
    getAccountInfoTool,
    stakeSolTool,
    deactivateStakeTool,
    createTokenTool,
    mintTokensTool,
    burnTokensTool,
    transferTokenTool,
    closeEmptyTokenAccountsTool,
    swapTokensTool,
    sendMemoTool,
    fetchPriceTool,
    // getTpsTool,
    // getSlotInfoTool,
    listValidatorsTool,
    getStakePositionsTool,
  ];

  return tools;
}
