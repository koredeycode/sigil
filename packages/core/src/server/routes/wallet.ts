import { Connection, PublicKey } from '@solana/web3.js';
import { Router } from 'express';
import { getAgent } from '../../lib/Database.js';

export const walletRouter: Router = Router();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

function getConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed');
}

// GET /api/wallet/:agentId/balance — SOL balance + token accounts from devnet
walletRouter.get('/:agentId/balance', async (req, res) => {
  try {
    const agent = getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found', data: null });
      return;
    }

    const connection = getConnection();
    const pubkey = new PublicKey(agent.pubkey);

    // Get SOL balance
    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / 1e9;

    // Get SPL token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
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
      message: 'Success',
      data: {
        sol: solBalance,
        solLamports: balance,
        tokens,
        pubkey: agent.pubkey,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// GET /api/wallet/:agentId/transactions — on-chain transaction history
walletRouter.get('/:agentId/transactions', async (req, res) => {
  try {
    const agent = getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found', data: null });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const connection = getConnection();
    const pubkey = new PublicKey(agent.pubkey);

    const signatures = await connection.getSignaturesForAddress(pubkey, { limit });

    const transactions = signatures.map((s) => ({
      signature: s.signature,
      blockTime: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
      slot: s.slot,
      status: s.confirmationStatus,
      err: s.err,
      memo: s.memo,
    }));

    res.json({ message: 'Success', data: transactions });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// GET /api/wallet/:agentId/transaction/:signature — single transaction detail
walletRouter.get('/:agentId/transaction/:signature', async (req, res) => {
  try {
    const agent = getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found', data: null });
      return;
    }

    const connection = getConnection();
    const tx = await connection.getParsedTransaction(req.params.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      res.status(404).json({ message: 'Transaction not found', data: null });
      return;
    }

    const detail = {
      signature: req.params.signature,
      slot: tx.slot,
      blockTime: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
      fee: tx.meta?.fee ? tx.meta.fee / 1e9 : 0,
      status: tx.meta?.err ? 'failed' : 'confirmed',
      error: tx.meta?.err ? JSON.stringify(tx.meta.err) : null,
      instructions: tx.transaction.message.instructions.map((ix: any) => ({
        programId: ix.programId?.toBase58?.() || ix.programId,
        program: ix.program || null,
        parsed: ix.parsed || null,
      })),
      preBalances: tx.meta?.preBalances,
      postBalances: tx.meta?.postBalances,
      logMessages: tx.meta?.logMessages,
    };

    res.json({ message: 'Success', data: detail });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});
