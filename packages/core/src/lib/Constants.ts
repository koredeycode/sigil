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
