import crypto from 'crypto';
import { getAuthToken, setAuthToken } from './Config.js';

const TOKEN_PREFIX = 'sig_';
const TOKEN_BYTES = 32;

/**
 * Generate a new session token in the format: sig_<64 hex chars>
 */
export function generateToken(): string {
  const hex = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  return `${TOKEN_PREFIX}${hex}`;
}

/**
 * Create and store a new session token. Returns the token string.
 * This is called on `sigil start`.
 */
export function createSessionToken(): string {
  const token = generateToken();
  setAuthToken(token);
  return token;
}

/**
 * Validate the given token against the stored session token.
 */
export function validateToken(token: string): boolean {
  const stored = getAuthToken();
  if (!stored || !token) return false;

  // Constant-time comparison to prevent timing attacks
  if (token.length !== stored.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(stored));
}

/**
 * Rotate the session token — generates a new one and invalidates the old.
 * Returns the new token.
 */
export function rotateToken(): string {
  return createSessionToken();
}

/**
 * Encrypt an API key for storage in the providers table.
 * Uses AES-256-GCM with a machine-derived secret.
 */
export function encryptApiKey(apiKey: string): string {
  const { key } = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an API key from storage.
 */
export function decryptApiKey(encrypted: string): string {
  const [ivB64, authTagB64, ciphertext] = encrypted.split(':');
  if (!ivB64 || !authTagB64 || !ciphertext) {
    throw new Error('Invalid encrypted key format');
  }

  const { key } = deriveKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Derive an encryption key from machine-specific data.
 * Not cryptographically rigorous for production — reasonable for a local dev tool.
 */
function deriveKey(): { key: Buffer } {
  const hostname = require('os').hostname();
  const username = require('os').userInfo().username;
  const salt = 'sigil-salt';

  const key = crypto
    .createHash('sha256')
    .update(`${hostname}${username}${salt}`)
    .digest();

  return { key };
}
