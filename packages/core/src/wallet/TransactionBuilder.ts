import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createBurnInstruction,
  createCloseAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Authorized,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Lockup,
  PublicKey,
  StakeProgram,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

const DEVNET_URL = 'https://api.devnet.solana.com';

/** Memo Program ID (v2) */
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

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

// ─── Staking Builders ──────────────────────────────────────────────────────

/**
 * Build a stake SOL transaction.
 * Creates a new stake account and delegates to the given validator.
 * Returns [transaction, stakeKeypair] — the caller must include stakeKeypair as a signer.
 */
export function buildStakeSol(
  from: PublicKey,
  lamports: number,
  validatorVoteAccount: PublicKey
): { transaction: Transaction; stakeKeypair: Keypair } {
  const stakeKeypair = Keypair.generate();

  const tx = new Transaction().add(
    StakeProgram.createAccount({
      fromPubkey: from,
      stakePubkey: stakeKeypair.publicKey,
      authorized: new Authorized(from, from), // staker & withdrawer = wallet
      lamports,
      lockup: new Lockup(0, 0, from), // no lockup
    }),
    StakeProgram.delegate({
      stakePubkey: stakeKeypair.publicKey,
      authorizedPubkey: from,
      votePubkey: validatorVoteAccount,
    })
  );

  return { transaction: tx, stakeKeypair };
}

/**
 * Build a deactivate-stake transaction.
 */
export function buildDeactivateStake(
  authorizedPubkey: PublicKey,
  stakeAccount: PublicKey
): Transaction {
  return new Transaction().add(
    StakeProgram.deactivate({
      stakePubkey: stakeAccount,
      authorizedPubkey,
    })
  );
}

// ─── SPL Token Builders ────────────────────────────────────────────────────

/**
 * Build a create-token (SPL Mint) transaction with optional Metaplex metadata.
 * Returns [transaction, mintKeypair] — the caller must include mintKeypair as a signer.
 */
export async function buildCreateToken(
  payer: PublicKey,
  decimals: number,
  connection: Connection,
  metadata?: { name: string; symbol: string; uri?: string }
): Promise<{ transaction: Transaction; mintKeypair: Keypair }> {
  const mintKeypair = Keypair.generate();
  const mintLen = getMintLen([]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      payer, // mint authority
      payer  // freeze authority
    )
  );

  // Attach Metaplex Token Metadata if provided
  if (metadata) {
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

    // Derive metadata PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    // Serialize CreateMetadataAccountV3 instruction data manually
    const nameBytes = Buffer.from(metadata.name);
    const symbolBytes = Buffer.from(metadata.symbol);
    const uriBytes = Buffer.from(metadata.uri ?? '');

    // Borsh-style serialization for CreateMetadataAccountV3
    const data = Buffer.concat([
      Buffer.from([33]),                                          // discriminator for CreateMetadataAccountV3
      // DataV2 struct:
      Buffer.from(new Uint32Array([nameBytes.length]).buffer),    // name length
      nameBytes,                                                  // name
      Buffer.from(new Uint32Array([symbolBytes.length]).buffer),  // symbol length
      symbolBytes,                                                // symbol
      Buffer.from(new Uint32Array([uriBytes.length]).buffer),     // uri length
      uriBytes,                                                   // uri
      Buffer.from([0, 0]),                                        // seller_fee_basis_points = 0
      Buffer.from([0]),                                           // creators = None
      Buffer.from([0]),                                           // collection = None
      Buffer.from([0]),                                           // uses = None
      // isMutable
      Buffer.from([1]),                                           // true
      // collectionDetails = None
      Buffer.from([0]),
    ]);

    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: metadataPDA, isSigner: false, isWritable: true },
          { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
          { pubkey: payer, isSigner: true, isWritable: false },   // mint authority
          { pubkey: payer, isSigner: true, isWritable: true },    // payer
          { pubkey: payer, isSigner: false, isWritable: false },  // update authority
          { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false }, // system program
        ],
        programId: TOKEN_METADATA_PROGRAM_ID,
        data,
      })
    );
  }

  return { transaction: tx, mintKeypair };
}

/**
 * Build a mint-tokens transaction.
 * Creates the destination ATA if it doesn't exist.
 */
export async function buildMintTokens(
  payer: PublicKey,
  mint: PublicKey,
  amount: bigint,
  connection: Connection
): Promise<Transaction> {
  const tx = new Transaction();
  const ata = getAssociatedTokenAddressSync(mint, payer);

  const ataInfo = await connection.getAccountInfo(ata);
  if (!ataInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(payer, ata, payer, mint)
    );
  }

  tx.add(
    createMintToInstruction(mint, ata, payer, amount)
  );

  return tx;
}

/**
 * Build a burn-tokens transaction.
 */
export function buildBurnTokens(
  owner: PublicKey,
  mint: PublicKey,
  amount: bigint
): Transaction {
  const ata = getAssociatedTokenAddressSync(mint, owner);

  return new Transaction().add(
    createBurnInstruction(ata, mint, owner, amount)
  );
}

/**
 * Build a transaction that closes all zero-balance token accounts.
 * Returns the transaction and the number of accounts to close.
 */
export function buildCloseEmptyAccounts(
  owner: PublicKey,
  emptyAccounts: PublicKey[]
): Transaction {
  const tx = new Transaction();

  for (const account of emptyAccounts) {
    tx.add(
      createCloseAccountInstruction(account, owner, owner)
    );
  }

  return tx;
}

// ─── Memo Builder ──────────────────────────────────────────────────────────

/**
 * Build a transaction with an on-chain memo.
 */
export function buildMemoTransaction(
  from: PublicKey,
  message: string
): Transaction {
  return new Transaction().add(
    new TransactionInstruction({
      keys: [{ pubkey: from, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(message, 'utf-8'),
    })
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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
