import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from '@solana/web3.js';

const DEVNET_URL = 'https://api.devnet.solana.com';

/**
 * Get a connection to Solana Devnet.
 */
export function getConnection(): Connection {
  return new Connection(DEVNET_URL, 'confirmed');
}

/**
 * Build a SOL transfer transaction.
 */
export function buildTransferSol(
  from: PublicKey,
  to: PublicKey,
  lamports: number
): Transaction {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports,
    })
  );
  return tx;
}

/**
 * Build an SPL token transfer transaction.
 * Creates the associated token account for the recipient if it doesn't exist.
 */
export async function buildTransferToken(
  from: PublicKey,
  to: PublicKey,
  mint: PublicKey,
  amount: bigint,
  connection: Connection
): Promise<Transaction> {
  const tx = new Transaction();

  const fromAta = getAssociatedTokenAddressSync(mint, from);
  const toAta = getAssociatedTokenAddressSync(mint, to);

  // Check if the recipient's ATA exists; if not, create it
  const toAtaInfo = await connection.getAccountInfo(toAta);
  if (!toAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        from, // payer
        toAta,
        to,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  tx.add(
    createTransferInstruction(fromAta, toAta, from, amount)
  );

  return tx;
}

/**
 * Convert SOL to lamports.
 */
export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

/**
 * Convert lamports to SOL.
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}
