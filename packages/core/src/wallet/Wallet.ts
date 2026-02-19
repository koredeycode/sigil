import { Keypair } from '@solana/web3.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const KEYS_DIR = path.join(os.homedir(), '.sigil', 'keys');

/**
 * Map of agent names to their loaded keypairs (in-memory cache).
 * Keys are wiped from this map on kill.
 */
const loadedKeys: Map<string, Keypair> = new Map();

// ─── Encrypted File Helpers ────────────────────────────────────────────────

/**
 * Derive an encryption key from machine-specific data.
 */
function deriveKey(): Buffer {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  const salt = 'sigil-wallet-key';

  return crypto
    .createHash('sha256')
    .update(`${hostname}${username}${salt}`)
    .digest();
}

/**
 * Encrypt and save a secret key to an agent-specific file.
 */
function saveKeyToFile(agentName: string, secretKeyBytes: Uint8Array): void {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKeyBytes)),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Store as: iv (16 bytes) + authTag (16 bytes) + ciphertext
  const filePath = path.join(KEYS_DIR, `${agentName}.enc`);
  const combined = Buffer.concat([iv, authTag, encrypted]);
  fs.writeFileSync(filePath, combined, { mode: 0o600 });
}

/**
 * Load and decrypt a secret key from an agent-specific file.
 */
function loadKeyFromFile(agentName: string): Uint8Array | null {
  const filePath = path.join(KEYS_DIR, `${agentName}.enc`);
  if (!fs.existsSync(filePath)) return null;

  const data = fs.readFileSync(filePath);
  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const ciphertext = data.subarray(32);

  const key = deriveKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return new Uint8Array(decrypted);
}

/**
 * Delete an agent's encrypted key file.
 */
function deleteKeyFile(agentName: string): void {
  const filePath = path.join(KEYS_DIR, `${agentName}.enc`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Create a new wallet for an agent.
 * Generates an Ed25519 keypair, stores the private key encrypted on disk.
 * Returns the public key (base58).
 */
export async function createWallet(agentName: string): Promise<string> {
  const keypair = Keypair.generate();

  // Store encrypted on disk
  saveKeyToFile(agentName, keypair.secretKey);

  // Cache in memory
  loadedKeys.set(agentName, keypair);

  return keypair.publicKey.toBase58();
}

/**
 * Import an existing wallet from a base58 private key.
 * Validates the key, stores it encrypted on disk.
 * Returns the public key (base58).
 */
export async function importWallet(agentName: string, privateKeyBase58: string): Promise<string> {
  const secretKey = Buffer.from(privateKeyBase58, 'base64');
  const keypair = Keypair.fromSecretKey(secretKey);

  saveKeyToFile(agentName, keypair.secretKey);
  loadedKeys.set(agentName, keypair);

  return keypair.publicKey.toBase58();
}

/**
 * Get the keypair for an agent.
 * First checks the in-memory cache, then falls back to encrypted disk storage.
 */
export async function getKeypair(agentName: string): Promise<Keypair> {
  // Check in-memory cache first
  const cached = loadedKeys.get(agentName);
  if (cached) return cached;

  // Retrieve from encrypted file
  const secretKey = loadKeyFromFile(agentName);
  if (!secretKey) {
    throw new Error(`No wallet found for agent "${agentName}"`);
  }

  const keypair = Keypair.fromSecretKey(secretKey);

  // Cache for subsequent calls
  loadedKeys.set(agentName, keypair);

  return keypair;
}

/**
 * Get the public key for an agent without loading the full keypair.
 * Uses the in-memory cache only.
 */
export function getPublicKey(agentName: string): string | undefined {
  const cached = loadedKeys.get(agentName);
  return cached?.publicKey.toBase58();
}

/**
 * Wipe the keypair from in-memory cache.
 * Used during kill — the key remains on disk but is removed from runtime memory.
 * The agent cannot sign transactions until explicitly restarted.
 */
export function wipeFromMemory(agentName: string): void {
  loadedKeys.delete(agentName);
}

/**
 * Delete the wallet entirely — removes from both memory and disk.
 * Used during agent destroy.
 */
export async function deleteWallet(agentName: string): Promise<void> {
  loadedKeys.delete(agentName);
  deleteKeyFile(agentName);
}

/**
 * Check if a keypair is currently loaded in memory for the given agent.
 */
export function isKeyLoaded(agentName: string): boolean {
  return loadedKeys.has(agentName);
}

/**
 * Get all agent names that have keys stored on disk.
 */
export async function listStoredWallets(): Promise<string[]> {
  if (!fs.existsSync(KEYS_DIR)) return [];
  const files = fs.readdirSync(KEYS_DIR);
  return files
    .filter((f) => f.endsWith('.enc'))
    .map((f) => f.replace('.enc', ''));
}
