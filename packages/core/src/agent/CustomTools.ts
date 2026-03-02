import { DynamicStructuredTool } from '@langchain/core/tools';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { deleteCronJob, getAgent, insertCronJob } from '../lib/Database.js';
import { requestAirdrop, signAndSubmit } from '../wallet/Signer.js';
import { buildTransferSol, getConnection, lamportsToSol, solToLamports } from '../wallet/TransactionBuilder.js';
import { getKeypair } from '../wallet/Wallet.js';
import { agentManager } from './AgentManager.js';
import { cronScheduler } from './CronScheduler.js';

/**
 * Create the custom tools (formerly LegacyTools).
 */
export function createCustomTools(agentId: string, agentName: string): DynamicStructuredTool[] {
  const connection = getConnection();

  const tools: DynamicStructuredTool[] = [
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
    }),

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

  if (agentName === 'sigil') {
    tools.push(
      new DynamicStructuredTool({
        name: 'manage_agent',
        description: 'Create, start, pause, or destroy sub-agents.',
        schema: z.object({
          action: z.enum(['create', 'start', 'pause', 'destroy']).describe('The action to perform'),
          name: z.string().describe('Name of the target agent (e.g., trader, researcher)'),
          loopInterval: z.number().optional().describe('Interval in ms for autonomous cycle (create only)'),
          prompt: z.string().optional().describe('System prompt / personality for the agent (create only)')
        }),
        func: async ({ action, name, loopInterval, prompt }) => {
          try {
            switch (action) {
              case 'create':
                await agentManager.create(name, loopInterval || 60000, undefined, prompt);
                return `Agent ${name} created successfully.`;
              case 'start':
                await agentManager.start(name);
                return `Agent ${name} started successfully.`;
              case 'pause':
                agentManager.pause(name);
                return `Agent ${name} paused successfully.`;
              case 'destroy':
                await agentManager.destroy(name);
                return `Agent ${name} destroyed successfully.`;
              default:
                return `Unknown action ${action}`;
            }
          } catch (e: any) {
            return `Failed to ${action} agent ${name}: ${e.message}`;
          }
        }
      }),
      new DynamicStructuredTool({
        name: 'list_agents',
        description: 'Get a list of all instantiated agents and their statuses.',
        schema: z.object({}),
        func: async () => {
          try {
            const agents = agentManager.list();
            return JSON.stringify(agents.map(a => ({ 
              id: a.id, 
              name: a.name, 
              status: a.status,
              pubkey: a.pubkey,
              loop_interval: a.loop_interval,
              created_at: a.created_at
            })), null, 2);
          } catch (e: any) {
            return `Failed to list agents: ${e.message}`;
          }
        }
      }),
      new DynamicStructuredTool({
        name: 'schedule_cron_job',
        description: 'Schedule a cron job to send a prompt to an agent at given intervals.',
        schema: z.object({
          name: z.string().describe('A descriptive name for this scheduled task'),
          expression: z.string().describe('Cron expression (e.g. "*/5 * * * *")'),
          targetAgentName: z.string().describe('The name of the target agent to send the prompt to'),
          prompt: z.string().describe('The prompt/task to run when the cron triggers')
        }),
        func: async ({ name, expression, targetAgentName, prompt }) => {
          try {
            const agent = getAgent(targetAgentName);
            if (!agent) return `Agent ${targetAgentName} not found.`;
            const jobId = insertCronJob(agent.id, name, expression, prompt);
            cronScheduler.schedule(String(jobId), expression, agent.id, agent.name, prompt);
            return `Cron job ${jobId} ('${name}') scheduled for agent ${targetAgentName} with expression ${expression}.`;
          } catch (e: any) {
            return `Failed to schedule cron job: ${e.message}`;
          }
        }
      }),
      new DynamicStructuredTool({
        name: 'cancel_cron_job',
        description: 'Cancel a scheduled cron job using its ID.',
        schema: z.object({
          jobId: z.number().describe('The ID of the cron job to cancel')
        }),
        func: async ({ jobId }) => {
          try {
            deleteCronJob(jobId);
            cronScheduler.cancel(String(jobId));
            return `Cron job ${jobId} canceled successfully.`;
          } catch (e: any) {
            return `Failed to cancel cron job ${jobId}: ${e.message}`;
          }
        }
      })
    );
  }

  return tools;
}
