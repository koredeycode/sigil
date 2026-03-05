/**
 * Centralized magic numbers for the Sigil Core package.
 */
export const CONSTANTS = {
  PORTS: {
    API: 7445,
    WEB: 7445,
  },
  TIMEOUTS: {
    LLM_INVOKE_MS: 60 * 1000,
  },
  RATE_LIMITS: {
    API_WINDOW_MS: 15 * 60 * 1000,
    API_MAX_REQUESTS: 100,
    LLM_WINDOW_MS: 60 * 1000,
    LLM_MAX_REQUESTS: 10,
    AUTH_WINDOW_MS: 15 * 60 * 1000,
    AUTH_MAX_REQUESTS: 5,
  },
  CACHE: {
    MAX_AGENT_GRAPHS: 50,
  }
};

export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';
export const SOL_TOKEN_IDENTIFIER = 'SOL';

/**
 * Checks if a given token identifier represents native SOL.
 * @param token The token identifier string (e.g., 'SOL', a mint address, or null/undefined)
 * @returns boolean true if the token is SOL or the wrapped SOL mint
 */
export function isSolToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return token === SOL_TOKEN_IDENTIFIER || token === NATIVE_SOL_MINT;
}
