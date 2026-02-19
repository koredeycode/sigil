import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import keytar from 'keytar';

const SERVICE_NAME = 'sigil';

/**
 * Map of agent names to their loaded keypairs (in-memory cache).
 * Keys are wiped from this map on kill.
 */
const loadedKeys: Map<string, Keypair> = new Map();

/**
 * Create a new wallet for an agent.
 * Generates an Ed25519 keypair, stores the private key in OS Keychain.
 * Returns the public key (base58).
 */
export async function createWallet(agentName: string): Promise<string> {
  const keypair = Keypair.generate();
  const privateKeyBase58 = bs58.encode(keypair.secretKey);

  // Store in OS Keychain: service="sigil", account=agentName
  await keytar.setPassword(SERVICE_NAME, agentName, privateKeyBase58);

  // Cache in memory
  loadedKeys.set(agentName, keypair);

  return keypair.publicKey.toBase58();
}

/**
 * Import an existing wallet from a base58 private key.
 * Validates the key, stores it in OS Keychain.
 * Returns the public key (base58).
 */
export async function importWallet(agentName: string, privateKeyBase58: string): Promise<string> {
  const secretKey = bs58.decode(privateKeyBase58);
  const keypair = Keypair.fromSecretKey(secretKey);

  await keytar.setPassword(SERVICE_NAME, agentName, privateKeyBase58);
  loadedKeys.set(agentName, keypair);

  return keypair.publicKey.toBase58();
}

/**
 * Get the keypair for an agent.
 * First checks the in-memory cache, then falls back to OS Keychain.
 */
export async function getKeypair(agentName: string): Promise<Keypair> {
  // Check in-memory cache first
  const cached = loadedKeys.get(agentName);
  if (cached) return cached;

  // Retrieve from OS Keychain
  const privateKeyBase58 = await keytar.getPassword(SERVICE_NAME, agentName);
  if (!privateKeyBase58) {
    throw new Error(`No wallet found for agent "${agentName}" in OS Keychain`);
  }

  const secretKey = bs58.decode(privateKeyBase58);
  const keypair = Keypair.fromSecretKey(secretKey);

  // Cache for subsequent calls
  loadedKeys.set(agentName, keypair);

  return keypair;
}

/**
 * Get the public key for an agent without loading the full keypair.
 * Uses the in-memory cache or the pubkey stored in the DB.
 */
export function getPublicKey(agentName: string): string | undefined {
  const cached = loadedKeys.get(agentName);
  return cached?.publicKey.toBase58();
}

/**
 * Wipe the keypair from in-memory cache.
 * Used during kill — the key remains in OS Keychain but is removed from runtime memory.
 * The agent cannot sign transactions until explicitly restarted.
 */
export function wipeFromMemory(agentName: string): void {
  loadedKeys.delete(agentName);
}

/**
 * Delete the wallet entirely — removes from both memory and OS Keychain.
 * Used during agent destroy. Should prompt for backup first.
 */
export async function deleteWallet(agentName: string): Promise<void> {
  loadedKeys.delete(agentName);
  await keytar.deletePassword(SERVICE_NAME, agentName);
}

/**
 * Check if a keypar is currently loaded in memory for the given agent.
 */
export function isKeyLoaded(agentName: string): boolean {
  return loadedKeys.has(agentName);
}

/**
 * Get all agent names that have keys stored in the OS Keychain.
 */
export async function listStoredWallets(): Promise<string[]> {
  const credentials = await keytar.findCredentials(SERVICE_NAME);
  return credentials.map((c) => c.account);
}
