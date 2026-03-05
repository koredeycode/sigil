import { Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { insertTransaction, updateTransactionStatus } from '../lib/Database.js';
import { TradeIntent, validateIntent } from '../lib/Guardrails.js';
import { getConnection } from './TransactionBuilder.js';
import { getKeypair, isKeyLoaded } from './Wallet.js';

export interface SignResult {
  signature: string;
  status: 'confirmed' | 'failed';
  error?: string;
}

/**
 * Sign and submit a transaction to Solana Devnet.
 * This is the ONLY function that signs transactions — all signing goes through here.
 *
 * @param agentName - The agent whose wallet will sign
 * @param transaction - The prepared transaction
 * @param agentId - Agent ID for DB logging
 * @param txType - Transaction type for logging (e.g., 'transfer', 'mint')
 * @param txMeta - Optional metadata for logging (token, amount, recipient)
 * @param extraSigners - Optional additional keypairs to sign the transaction (e.g., mintKeypair, stakeKeypair)
 */
export async function signAndSubmit(
  agentName: string,
  transaction: Transaction,
  agentId: string,
  txType: string,
  txMeta?: {
    token?: string;
    amount?: number;
    recipient?: string;
  },
  extraSigners?: Keypair[]
): Promise<SignResult> {
  // Safety check: ensure the key is loaded (not wiped by kill)
  if (!isKeyLoaded(agentName)) {
    throw new Error(
      `Agent "${agentName}" is inactive (keys wiped) — private key not in memory. Cannot sign.`
    );
  }

  // Token validation for value transfers
  if (['transfer', 'swap', 'stake'].includes(txType) && !txMeta?.token) {
    throw new Error(`Transaction type '${txType}' requires 'token' field in metadata`);
  }

  // ─── GUARDRAILS CHECK ───────────────────────────────────────────────────
  const intent: TradeIntent = {
    agentId,
    type: txType as any,
    amount: txMeta?.amount,
    token: txMeta?.token,
    recipient: txMeta?.recipient,
  };

  const validation = validateIntent(intent);
  if (!validation.passed) {
    throw new Error(`Guardrail Blocked: ${validation.reason}`);
  }

  if (validation.requiresConfirmation) {
    throw new Error(`Guardrail Alert: ${validation.reason} [REQUIRES_MANUAL_CONFIRMATION]`);
  }
  // ────────────────────────────────────────────────────────────────────────

  // Record pending transaction in DB
  const dbResult = insertTransaction(
    agentId,
    txType,
    txMeta?.token ?? null,
    txMeta?.amount ?? null,
    txMeta?.recipient ?? null,
    null, // signature not yet known
    'pending',
    null  // fee not yet known
  );
  const txDbId = Number(dbResult.lastInsertRowid);

  try {
    const keypair = await getKeypair(agentName);
    const connection = getConnection();

    // Set recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = keypair.publicKey;

    // Sign and submit
    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair, ...(extraSigners || [])], {
      commitment: 'confirmed',
    });

    // Update DB with signature and confirmed status
    updateTransactionStatus(txDbId, 'confirmed', signature);

    return { signature, status: 'confirmed' };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Update DB with failed status
    updateTransactionStatus(txDbId, 'failed');

    return { signature: '', status: 'failed', error: errMsg };
  }
}

/**
 * Request a SOL airdrop from the devnet faucet.
 */
export async function requestAirdrop(
  agentName: string,
  agentId: string,
  lamports: number
): Promise<SignResult> {
  if (!isKeyLoaded(agentName)) {
    throw new Error(`Agent "${agentName}" is inactive (keys wiped) — cannot request airdrop.`);
  }

  const dbResult = insertTransaction(
    agentId,
    'airdrop',
    'SOL',
    lamports / 1e9,
    null,
    null,
    'pending',
    null
  );
  const txDbId = Number(dbResult.lastInsertRowid);

  try {
    const keypair = await getKeypair(agentName);
    const connection = getConnection();

    const signature = await connection.requestAirdrop(keypair.publicKey, lamports);
    await connection.confirmTransaction(signature, 'confirmed');

    updateTransactionStatus(txDbId, 'confirmed', signature);

    return { signature, status: 'confirmed' };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    updateTransactionStatus(txDbId, 'failed');
    return { signature: '', status: 'failed', error: errMsg };
  }
}
