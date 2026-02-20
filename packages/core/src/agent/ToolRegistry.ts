import { DynamicStructuredTool } from '@langchain/core/tools';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { requestAirdrop, signAndSubmit } from '../wallet/Signer.js';
import { buildTransferSol, getConnection, lamportsToSol, solToLamports } from '../wallet/TransactionBuilder.js';
import { getKeypair } from '../wallet/Wallet.js';

/**
 * Create all tools for the Sigil agent.
 * Each tool is a DynamicStructuredTool with Zod schema validation.
 */
export function createTools(agentId: string, agentName: string): DynamicStructuredTool[] {
  const connection = getConnection();

  return [
    // ─── Wallet & Balance ──────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'get_balance',
      description: 'Check SOL balance and all SPL token holdings for this agent\'s wallet.',
      schema: z.object({}),
      func: async () => {
        try {
          console.info(`[Tool:get_balance] Starting for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const balance = await connection.getBalance(keypair.publicKey);
          const solBalance = lamportsToSol(balance);

          // Get token accounts
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
    }),

    new DynamicStructuredTool({
      name: 'request_airdrop',
      description: 'Request SOL from the devnet faucet. Maximum 2 SOL per request.',
      schema: z.object({
        amount: z.number().min(0.1).max(2).describe('Amount of SOL to request (max 2)'),
      }),
      func: async ({ amount }) => {
        try {
          console.info(`[Tool:request_airdrop] Requesting ${amount} SOL for ${agentName}`);
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
    }),

    new DynamicStructuredTool({
      name: 'transfer_sol',
      description: 'Send SOL to an address. Subject to guardrails.',
      schema: z.object({
        to: z.string().describe('Recipient Solana address (base58)'),
        amount: z.number().positive().describe('Amount of SOL to send'),
      }),
      func: async ({ to, amount }) => {
        try {
          console.info(`[Tool:transfer_sol] Transferring ${amount} SOL to ${to} for ${agentName}`);
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
    }),

    new DynamicStructuredTool({
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
    }),

    // ─── SPL Token Management ──────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'get_token_accounts',
      description: 'List all SPL token accounts owned by this wallet.',
      schema: z.object({}),
      func: async () => {
        try {
          console.info(`[Tool:get_token_accounts] Fetching for ${agentName}`);
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
    }),

    new DynamicStructuredTool({
      name: 'get_portfolio_snapshot',
      description: 'Get a full breakdown of holdings with percentages of total portfolio.',
      schema: z.object({}),
      func: async () => {
        try {
          console.info(`[Tool:get_portfolio_snapshot] Fetching for ${agentName}`);
          const keypair = await getKeypair(agentName);
          const balance = await connection.getBalance(keypair.publicKey);
          const solBalance = lamportsToSol(balance);

          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            keypair.publicKey,
            { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
          );

          // For devnet, we estimate all tokens at 0 SOL value unless they have
          // a known price source. SOL is the baseline.
          const totalValue = solBalance; // simplified for devnet

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
                percentage: 0, // devnet tokens don't have SOL price
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
    }),

    // ─── Intelligence ──────────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'get_account_info',
      description: 'Fetch on-chain account metadata for any Solana address.',
      schema: z.object({
        address: z.string().describe('Solana address to query (base58)'),
      }),
      func: async ({ address }) => {
        try {
          console.info(`[Tool:get_account_info] Fetching info for ${address}`);
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
    }),
  ];
}
