# Code Fix Instructions for Sigil Codebase

**Generated:** March 4, 2026  
**Priority:** Critical → High → Medium → Low

This document provides step-by-step instructions to fix the 27 issues identified in the comprehensive code review. Follow the order of priority to address the most critical issues first.

---

## 🔴 CRITICAL FIXES (Priority 1)

### Fix 1: Remove TypeScript Type Checking Bypass

**File:** `extension/popup.tsx`

**Issue:** The file has `// @ts-nocheck` at line 1, completely disabling TypeScript type checking.

**Instructions:**
1. Remove the `// @ts-nocheck` comment from line 1
2. Run `pnpm --filter sigil build` to see all type errors
3. Fix each type error properly by:
   - Adding proper type annotations
   - Using type assertions where necessary (`as` keyword)
   - Defining interfaces for complex objects
4. Pay special attention to:
   - `requestObj` state (define a proper type/interface)
   - `portfolio` and `simulationData` states
   - Event handlers and their parameter types

**Expected Outcome:** File compiles without errors, full TypeScript checking enabled.

---

### Fix 2: Replace Excessive Console Logging with Proper Logger

**Files:** Multiple (50+ occurrences across `packages/core/`)

**Issue:** Console.log statements throughout the codebase, including sensitive operations.

**Instructions:**

1. Create a new logger utility at `packages/core/src/lib/Logger.ts`:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level || 'info',
      enableConsole: config?.enableConsole ?? true,
      enableFile: config?.enableFile ?? false,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (this.config.enableConsole) {
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](logMessage, data || '');
    }

    // TODO: Add file logging if needed
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: any): void {
    this.log('error', message, error);
  }
}

export const logger = new Logger();
export default logger;
```

2. Add export to `packages/core/src/index.ts`:
```typescript
export { logger } from './lib/Logger.js';
```

3. Replace console.log/error/warn statements systematically:
   - In `packages/core/src/server/app.ts`: Replace `console.info` with `logger.info`
   - In `packages/core/src/agent/AgentLoop.ts`: Replace `console.info` with `logger.info`
   - In `packages/core/bin/commands/*.ts`: Keep console.log for user-facing CLI output, but replace internal logging
   - In error handlers: Replace `console.error` with `logger.error`

4. **CRITICAL:** In `packages/core/test-key.ts` - DO NOT LOG PRIVATE KEYS. Either:
   - Remove the file entirely (recommended)
   - Or sanitize output: `logger.info('Keypair generated successfully')`

**Expected Outcome:** Centralized logging with level control, no sensitive data in logs.

---

### Fix 3: Replace `any` Types with Proper Types

**Files:** Multiple (40+ occurrences)

**Issue:** Excessive use of `any` type, especially in error handlers and API responses.

**Instructions:**

1. **Error Handlers** - Replace `catch (e: any)` with proper error handling:

```typescript
// OLD:
} catch (e: any) {
  console.error('Error:', e.message);
}

// NEW:
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error('Operation failed:', message);
}
```

2. **File:** `packages/core/src/lib/ModelFetcher.ts`

Replace the `any` types in parseModels functions:

```typescript
// Define proper interfaces at the top of the file:
interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface AnthropicModel {
  id: string;
  display_name?: string;
  created_at: string;
}

interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface GoogleModel {
  name: string;
  displayName?: string;
  description?: string;
}

// Then update the parseModels functions to use these types:
const PROVIDER_ENDPOINTS: Record<string, { 
  url: string; 
  parseModels: (data: { data?: any[]; models?: any[] }) => ModelInfo[] 
}> = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    parseModels: (data: { data?: OpenAIModel[] }) => 
      (data.data || [])
        .filter((m) => m.id.startsWith('gpt-'))
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((m) => ({ id: m.id, label: m.id })),
  },
  // ... similar for other providers
};
```

3. **File:** `packages/core/src/server/types.ts`

```typescript
// OLD:
export interface ApiResponse<T = any> {

// NEW:
export interface ApiResponse<T = unknown> {
```

4. **File:** `packages/core/src/server/routes/wallet.ts` (line 115)

Define a proper instruction type:

```typescript
interface TransactionInstruction {
  programId: string;
  keys: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
  data: string;
}

// Then use it:
instructions: tx.transaction.message.instructions.map((ix: TransactionInstruction) => ({
```

**Expected Outcome:** Improved type safety, better IDE autocomplete, fewer runtime type errors.

---

### Fix 4: Add Input Validation with Zod

**Files:** `packages/core/src/server/routes/*.ts`

**Issue:** API endpoints lack proper input validation.

**Instructions:**

1. Add Zod as a dependency (it's already in the project):
   - Verify in `packages/core/package.json` that zod is listed

2. Create validation schemas at `packages/core/src/server/schemas.ts`:

```typescript
import { z } from 'zod';

// Extension routes
export const simulateTransactionSchema = z.object({
  transactionMessage: z.string().min(1, 'Transaction message required').max(100000),
  origin: z.string().url('Invalid origin URL').optional(),
});

export const signTransactionSchema = z.object({
  transactionMessage: z.string().min(1, 'Transaction message required').max(100000),
});

// Chat routes
export const chatMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  includeHistory: z.boolean().optional(),
});

// Agent routes
export const createAgentSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid agent name'),
  loopInterval: z.number().int().min(5000).max(3600000).optional(),
  prompt: z.string().max(5000).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  loopInterval: z.number().int().min(5000).max(3600000).optional(),
  status: z.enum(['running', 'paused']).optional(),
  prompt: z.string().max(5000).optional(),
});

// Provider routes
export const addProviderSchema = z.object({
  name: z.string().min(1),
  apiKey: z.string().min(1).max(500),
  model: z.string().min(1),
  baseUrl: z.string().url().optional(),
  compat: z.enum(['openai', 'anthropic']).optional(),
});

// Config routes
export const updateConfigSchema = z.object({
  kill_switch: z.enum(['true', 'false']).optional(),
  per_trade_limit: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  daily_volume_cap: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  slippage_cap: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  cooldown_period: z.string().regex(/^\d+$/).optional(),
  confirmation_threshold: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  rpc_url: z.string().url().optional(),
});
```

3. Create a validation middleware at `packages/core/src/server/middleware/validate.ts`:

```typescript
import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: 'Validation error',
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
          data: null,
        });
        return;
      }
      next(error);
    }
  };
}
```

4. Apply validation to routes. Example for `packages/core/src/server/routes/extension.ts`:

```typescript
import { validateBody } from '../middleware/validate.js';
import { simulateTransactionSchema, signTransactionSchema } from '../schemas.js';

// Add to routes:
extensionRouter.post('/simulate', validateBody(simulateTransactionSchema), async (req, res) => {
  // ... existing code
});

extensionRouter.post('/sign', validateBody(signTransactionSchema), async (req, res) => {
  // ... existing code
});
```

5. Apply to all other routes similarly:
   - `routes/chat.ts` - use `chatMessageSchema`
   - `routes/agents.ts` - use `createAgentSchema`, `updateAgentSchema`
   - `routes/providers.ts` - use `addProviderSchema`
   - `routes/config.ts` - use `updateConfigSchema`

**Expected Outcome:** All API inputs validated, clear error messages for invalid requests.

---

## 🟠 HIGH PRIORITY FIXES (Priority 2)

### Fix 5: Implement Rate Limiting

**Files:** `packages/core/src/server/app.ts`, route files

**Issue:** No rate limiting on API endpoints.

**Instructions:**

1. Install express-rate-limit:
```bash
cd packages/core
pnpm add express-rate-limit
pnpm add -D @types/express-rate-limit
```

2. Create rate limit configs at `packages/core/src/server/middleware/rateLimit.ts`:

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for LLM endpoints
export const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many chat requests, please slow down.',
});

// Strict limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts.',
});
```

3. Apply in `packages/core/src/server/app.ts`:

```typescript
import { apiLimiter, authLimiter, llmLimiter } from './middleware/rateLimit.js';

// After CORS and JSON middleware:
app.use('/api', apiLimiter);

// Before route registration:
app.use('/api/chat', llmLimiter);
app.use('/api/extension/token', authLimiter);
```

**Expected Outcome:** API protected from abuse, DoS attacks, and quota exhaustion.

---

### Fix 6: Add Database Transactions for Multi-Statement Operations

**File:** `packages/core/src/lib/Database.ts`

**Issue:** Multiple database operations without transactions (e.g., deleteAgent).

**Instructions:**

1. Add transaction helper functions at the top of Database.ts (after imports):

```typescript
/**
 * Execute multiple database operations in a transaction.
 * Rolls back all changes if any operation fails.
 */
function runInTransaction(db: DatabaseSync, operations: () => void): void {
  db.exec('BEGIN TRANSACTION');
  try {
    operations();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
```

2. Update the `deleteAgent` function (around line 212):

```typescript
export function deleteAgent(id: string) {
  const db = getDatabase();
  runInTransaction(db, () => {
    db.prepare('DELETE FROM cron_jobs WHERE agent_id = ?').run(id);
    db.prepare('DELETE FROM logs WHERE agent_id = ?').run(id);
    db.prepare('DELETE FROM transactions WHERE agent_id = ?').run(id);
    db.prepare('DELETE FROM chats WHERE agent_id = ?').run(id);
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  });
}
```

3. Look for other multi-statement operations and wrap them similarly (search for consecutive `.prepare` calls).

**Expected Outcome:** Data consistency guaranteed, no partial updates on failure.

---

### Fix 7: Standardize Error Handling

**Files:** Multiple throughout codebase

**Issue:** Inconsistent error handling patterns.

**Instructions:**

1. Create error classes at `packages/core/src/lib/Errors.ts`:

```typescript
export class SigilError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'SigilError';
  }
}

export class ValidationError extends SigilError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends SigilError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends SigilError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends SigilError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 500);
    this.name = 'ConfigurationError';
  }
}
```

2. Update global error handler in `packages/core/src/server/app.ts`:

```typescript
import { SigilError } from '../lib/Errors.js';
import { logger } from '../lib/Logger.js';

// Replace existing error handler:
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof SigilError) {
    logger.error(`${err.name}: ${err.message}`, err.details);
    res.status(err.statusCode).json({ 
      error: err.code,
      message: err.message, 
      details: err.details,
      data: null 
    });
    return;
  }

  // Unknown error
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred', 
    data: null 
  });
});
```

3. Use in route handlers (example):

```typescript
import { NotFoundError, ValidationError } from '../../lib/Errors.js';

// In route:
if (!agent) {
  throw new NotFoundError('Agent');
}

if (!isValidInput(data)) {
  throw new ValidationError('Invalid input format', { field: 'data' });
}
```

4. Replace silent error catches:
   - In `packages/core/src/server/socket.ts` line 171: Change `} catch (_) {}` to log the error
   - Search for `catch (_)` or `catch (e)` where `e` is unused and add logging

**Expected Outcome:** Consistent error handling, better debugging, proper HTTP status codes.

---

### Fix 8: Make Server URL Configurable

**Files:** `extension/background/index.ts`, `extension/popup.tsx`

**Issue:** Hardcoded `http://127.0.0.1:7445` URLs.

**Instructions:**

1. Create a config file at `extension/core/config.ts`:

```typescript
// Default to localhost, can be overridden via chrome.storage
const DEFAULT_SERVER_URL = 'http://127.0.0.1:7445';

export async function getServerUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sigil_server_url'], (result) => {
      resolve(result.sigil_server_url || DEFAULT_SERVER_URL);
    });
  });
}

export async function setServerUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ sigil_server_url: url }, () => {
      resolve();
    });
  });
}
```

2. Update `extension/background/index.ts`:

```typescript
import { getServerUrl } from '../core/config';

// Replace const SIGIL_SERVER_URL = "..." with async function calls:
// Example for the connect method:
if (method === "set_token") {
  const token = params?.token;
  if (!token) {
    sendResponse({ error: "Token is required" });
    return true;
  }

  getServerUrl().then(serverUrl => {
    fetch(`${serverUrl}/api/extension/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    // ... rest of the code
  });
  return true;
}
```

3. Update `extension/popup.tsx` similarly.

4. Add UI in popup to configure server URL (optional but recommended).

**Expected Outcome:** Extension can connect to different server instances.

---

### Fix 9: Add Request Timeouts for LLM Calls

**File:** `packages/core/src/agent/AgentLoop.ts`

**Issue:** LLM invocations lack timeout configurations.

**Instructions:**

1. Add timeout configuration in the invoke call (around line 95):

```typescript
const result = await graph.invoke(
  { messages: inputMessages },
  { 
    configurable: { thread_id: agentId },
    signal: AbortSignal.timeout(120000), // 2 minute timeout
    callbacks: [
      {
        handleLLMEnd: (output) => {
          // ... existing code
        }
      }
    ]
  }
);
```

2. Wrap in try-catch to handle timeout errors:

```typescript
try {
  const result = await graph.invoke(/* ... */);
  // ... rest of code
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    logger.error(`LLM call timed out for agent ${agentName}`);
    throw new Error('Request timed out. Please try again.');
  }
  throw error;
}
```

3. Make timeout configurable via config table (optional enhancement):
   - Add `llm_timeout` to default config in Database.ts
   - Create getters/setters in Config.ts
   - Use in AgentLoop.ts

**Expected Outcome:** No hung requests, better resource management.

---

### Fix 10: Add Cache Size Limit

**File:** `packages/core/src/agent/AgentLoop.ts`

**Issue:** Agent graph cache grows indefinitely.

**Instructions:**

1. Replace the simple Map with an LRU cache. Add a helper before the cache definition:

```typescript
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    this.cache.set(key, value);

    // Remove oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Replace the existing Map:
const agentGraphCache = new LRUCache<string, ReturnType<typeof createReactAgent>>(50);
```

2. Update the usage in `getOrCreateGraph`:

```typescript
async function getOrCreateGraph(agentId: string, agentName: string) {
  const cached = agentGraphCache.get(agentId);
  if (cached) {
    return cached;
  }
  
  // ... create graph ...
  
  agentGraphCache.set(agentId, graph);
  return graph;
}
```

**Expected Outcome:** Bounded memory usage, LRU eviction of old graphs.

---

## 🟡 MEDIUM PRIORITY FIXES (Priority 3)

### Fix 11: Align Dependency Versions

**Files:** `packages/*/package.json`

**Issue:** Inconsistent React and TypeScript versions across packages.

**Instructions:**

1. Update `packages/tui/package.json`:
```json
"react": "^19.0.0",
"@types/react": "^19.0.0"
```

2. Update `extension/package.json`:
```json
"react": "^19.0.0",
"react-dom": "^19.0.0",
"@types/react": "^19.0.0",
"@types/react-dom": "^19.0.0",
"typescript": "^5.7.3"
```

3. Update `packages/web/package.json`:
```json
"typescript": "^5.7.3"
```

4. Run clean install:
```bash
pnpm install
pnpm build
```

5. Test each package to ensure no breaking changes.

**Expected Outcome:** Consistent dependencies, reduced bundle size, fewer type conflicts.

---

### Fix 12: Remove Test Files from Production

**Files:** `packages/core/test-key.ts`, `packages/core/test-route.js`

**Issue:** Test/debug files in production code.

**Instructions:**

1. Delete these files:
```bash
rm packages/core/test-key.ts
rm packages/core/test-route.js
```

2. If they're imported anywhere, remove those imports.

3. Update `.gitignore` to prevent similar files:
```
# Test files
test-*.ts
test-*.js
*.test.ts (if not in __tests__ directory)
```

**Expected Outcome:** Cleaner production builds, no sensitive data exposure.

---

### Fix 13: Remove Circular Dependency

**File:** `packages/core/package.json`

**Issue:** Core package depends on TUI package.

**Instructions:**

1. Analyze why core depends on tui (line 37 in core's package.json)

2. If TUI is only used in commands/tui.ts:
   - Make it an optional peer dependency
   - Or move tui command to tui package

3. If feasible, remove the dependency:
```json
// Remove from core/package.json:
"sigil-tui": "workspace:*",
```

4. Update `packages/core/bin/commands/tui.ts` to dynamically import:
```typescript
export async function register(program: Command) {
  program
    .command('tui')
    .description('Launch interactive terminal UI')
    .action(async () => {
      try {
        // Dynamic import to avoid circular dependency
        const { renderTUI } = await import('sigil-tui');
        await renderTUI();
      } catch (error) {
        console.error('Failed to load TUI. Make sure sigil-tui is installed.');
        process.exit(1);
      }
    });
}
```

**Expected Outcome:** Clean dependency graph, better modularity.

---

### Fix 14: Improve Socket Connection Management

**File:** `packages/web/src/hooks/useSocket.tsx`

**Issue:** No cleanup for auth token changes, missing exponential backoff.

**Instructions:**

1. Update the useEffect to handle token changes:

```typescript
useEffect(() => {
  const token = localStorage.getItem('sigil_token');
  const apiUrl = getApiUrl();

  // Improved reconnection config with exponential backoff
  const socketInstance = io(apiUrl || 'http://localhost:7445', {
    auth: token ? { token } : {},
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10, // Finite attempts
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000, // Max 30 seconds
    randomizationFactor: 0.5, // Adds jitter
    timeout: 20000, // Connection timeout
  });

  // ... existing event handlers ...

  socketRef.current = socketInstance;
  setSocket(socketInstance);

  return () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };
}, []); // Keep empty dependency array

// Add separate effect for token changes:
useEffect(() => {
  const handleStorageChange = () => {
    // Reconnect with new token
    if (socketRef.current) {
      socketRef.current.disconnect();
      window.location.reload(); // Or implement graceful reconnection
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

2. Similar updates for `packages/tui/src/hooks/useSocket.tsx` (but handle authToken prop changes).

**Expected Outcome:** Better connection resilience, proper cleanup.

---

### Fix 15: Clean Up Commented Code

**Files:** `packages/core/bin/cli.ts`, `packages/core/src/lib/Database.ts`

**Issue:** Large blocks of commented-out code.

**Instructions:**

1. In `packages/core/bin/cli.ts` (lines 30-40):
   - **Decision needed:** Either enable the banner or remove it entirely
   - If keeping: uncomment and use
   - If removing: delete the commented lines

2. In `packages/core/src/lib/Database.ts` (lines 125-129):
   - Remove commented migration function
   - If migrations are needed in future, use a proper migration system

**Expected Outcome:** Cleaner codebase, no dead code.

---

### Fix 16: Extract Magic Numbers to Constants

**Files:** Multiple

**Issue:** Magic numbers throughout codebase.

**Instructions:**

1. Create `packages/core/src/lib/Constants.ts`:

```typescript
// Server
export const API_PORT = 7445;
export const SOCKET_RECONNECT_DELAY = 1000;
export const SOCKET_MAX_RECONNECT_DELAY = 10000;

// Agent
export const DEFAULT_LOOP_INTERVAL = 60000; // 1 minute
export const DEFAULT_LLM_TIMEOUT = 120000; // 2 minutes
export const AGENT_CACHE_SIZE = 50;

// Database
export const DEFAULT_LOGS_LIMIT = 50;
export const DEFAULT_CHATS_LIMIT = 100;
export const DEFAULT_TRANSACTIONS_LIMIT = 20;

// Guardrails (from Config.ts defaults)
export const DEFAULT_PER_TRADE_LIMIT = 5; // percentage
export const DEFAULT_DAILY_VOLUME_CAP = 10; // SOL
export const DEFAULT_SLIPPAGE_CAP = 1; // percentage
export const DEFAULT_COOLDOWN_PERIOD = 30; // seconds
export const DEFAULT_CONFIRMATION_THRESHOLD = 50; // SOL
```

2. Replace hardcoded values with imports from Constants:

```typescript
import { API_PORT, DEFAULT_LOOP_INTERVAL } from './lib/Constants.js';

// In server/app.ts:
httpServer.listen(API_PORT, () => { /* ... */ });

// In agent creation:
loopInterval = loopInterval || DEFAULT_LOOP_INTERVAL;
```

**Expected Outcome:** Better maintainability, self-documenting code.

---

### Fix 17: Add Missing JSDoc Documentation

**File:** `packages/core/src/index.ts`

**Issue:** Public exports lack documentation.

**Instructions:**

Add JSDoc comments to all exported functions/classes:

```typescript
/**
 * Invalidates the cached agent graph for a specific agent.
 * Call this when agent configuration changes (model, tools, prompt, etc.)
 * 
 * @param agentId - The unique identifier of the agent
 * @example
 * ```typescript
 * invalidateAgentGraph('agent-123');
 * ```
 */
export { invalidateAgentGraph, /* ... */ } from './agent/AgentLoop.js';

/**
 * Manages agent lifecycle and state.
 * Singleton instance for controlling agents across the application.
 * 
 * @example
 * ```typescript
 * const mainAgent = agentManager.getMainAgent();
 * if (mainAgent) {
 *   await agentManager.start(mainAgent.id);
 * }
 * ```
 */
export { agentManager } from './agent/AgentManager.js';

// ... Add for all exports
```

**Expected Outcome:** Better DX for library consumers, improved IDE tooltips.

---

### Fix 18: Improve Path Resolution

**File:** `packages/core/src/server/app.ts`

**Issue:** Complex path resolution for web dist folder.

**Instructions:**

1. Add environment variable support in `packages/core/src/lib/Config.ts`:

```typescript
export function getWebDistPath(): string {
  return getConfig('web_dist_path') || process.env.WEB_DIST_PATH || '';
}

export function setWebDistPath(path: string): void {
  setConfig('web_dist_path', path);
}
```

2. Simplify in `packages/core/src/server/app.ts`:

```typescript
import { getWebDistPath } from '../lib/Config.js';

// Replace lines 78-98 with:
let webDistPath = getWebDistPath();

if (!webDistPath) {
  // Fallback to heuristic detection
  const isDev = __dirname.includes(`src${path.sep}server`) && !__dirname.includes('dist');
  const isCompiled = __dirname.includes(`dist${path.sep}src${path.sep}server`);
  
  if (isCompiled) {
    webDistPath = path.resolve(__dirname, '../../../../..', 'packages', 'web', 'dist');
  } else if (isDev) {
    webDistPath = path.resolve(__dirname, '../../../..', 'packages', 'web', 'dist');
  } else {
    webDistPath = path.resolve(__dirname, '..', '..', 'packages', 'web', 'dist');
  }
}

attachWebDashboard(app, webDistPath);
```

3. Document in README how to set WEB_DIST_PATH environment variable.

**Expected Outcome:** Simpler code, configurable paths, easier deployment.

---

### Fix 19: Add React Error Boundaries

**Files:** React component files in `packages/web/src/`

**Issue:** No error boundaries to catch React component errors.

**Instructions:**

1. Create `packages/web/src/components/ErrorBoundary.tsx`:

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

2. Wrap main app in `packages/web/src/App.tsx`:

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* existing app content */}
    </ErrorBoundary>
  );
}
```

3. Add boundaries around complex components (ChatBox, WalletView, etc.).

**Expected Outcome:** Graceful error handling, better UX, no white screens.

---

## 🟢 LOW PRIORITY FIXES (Priority 4)

### Fix 20: Improve Naming Consistency

**Files:** Multiple

**Issue:** Inconsistent file naming conventions.

**Instructions:**

1. Decide on a convention:
   - PascalCase for React components and classes: `ChatBox.tsx`, `AgentManager.ts`
   - camelCase for utilities and hooks: `useSocket.tsx`, `logger.ts`

2. Rename files as needed (be careful with imports):
   - Use IDE refactoring features to safely rename
   - Update all imports

3. Document the convention in a `CONTRIBUTING.md` file.

**Expected Outcome:** Consistent style, easier navigation.

---

### Fix 21: Add TypeScript Config Comments

**File:** `tsconfig.json` files

**Instructions:**

Add comments explaining non-obvious compiler options:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16", // Use Node16 for native ESM support
    "moduleResolution": "Node16", // Required with module: Node16
    "lib": ["ES2022"],
    "strict": true, // Enable all strict type checks
    "esModuleInterop": true, // Better CommonJS interop
    "skipLibCheck": true, // Skip type checking of declaration files for faster builds
    "forceConsistentCasingInFileNames": true, // Prevent cross-platform issues
    "resolveJsonModule": true, // Allow importing JSON files
    "declaration": true, // Generate .d.ts files
    "declarationMap": true, // Generate source maps for .d.ts
    "sourceMap": true // Generate .js.map files for debugging
  },
  "exclude": ["node_modules", "dist"]
}
```

**Expected Outcome:** Better understanding of TypeScript configuration.

---

### Fix 22: Environment Variable Documentation

**File:** Create `packages/core/.env.example`

**Instructions:**

Create a template for environment variables:

```bash
# RPC Configuration
RPC_URL=https://api.devnet.solana.com

# Server Configuration
API_PORT=7445
WEB_DIST_PATH=/path/to/web/dist

# Optional: OpenAI API Key (if not storing in database)
# OPENAI_API_KEY=sk-...

# Logging
LOG_LEVEL=info
```

Add to README:
```markdown
## Environment Variables

Copy `.env.example` to `.env` and configure as needed:

```bash
cp packages/core/.env.example packages/core/.env
```

See `.env.example` for available options.
```

**Expected Outcome:** Clear configuration documentation.

---

### Fix 23: Add Health Check Details

**File:** `packages/core/src/server/routes/status.ts`

**Instructions:**

Enhance health check to include more details:

```typescript
router.get('/', async (req, res) => {
  const agent = agentManager.getMainAgent();
  
  // Check database connectivity
  let dbHealthy = false;
  try {
    getDatabase();
    dbHealthy = true;
  } catch (error) {
    // Database issue
  }

  // Check if LLM provider is configured
  const primaryProvider = getPrimaryProvider();

  res.json({
    message: 'Sigil is running',
    data: {
      status: 'healthy',
      version: '0.1.0',
      agent: agent ? {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      } : null,
      database: dbHealthy ? 'connected' : 'error',
      llmProvider: primaryProvider ? primaryProvider.name : null,
      uptime: process.uptime(),
    },
  });
});
```

**Expected Outcome:** More informative health checks for monitoring.

---

## 📋 TESTING CHECKLIST

After implementing fixes, verify:

### Critical Tests:
- [ ] Extension popup compiles without `@ts-nocheck`
- [ ] All console.log replaced with logger calls
- [ ] API input validation works (test with invalid inputs)
- [ ] No private keys in logs

### High Priority Tests:
- [ ] Rate limiting activates after threshold
- [ ] Database transactions rollback on error
- [ ] Configurable server URL in extension
- [ ] LLM timeouts work correctly

### Medium Priority Tests:
- [ ] All packages build successfully
- [ ] No circular dependency warnings
- [ ] Socket reconnection works

### Low Priority Tests:
- [ ] Health check returns full details
- [ ] Documentation is clear

---

## 🚀 DEPLOYMENT STEPS

1. Create a new branch: `git checkout -b code-review-fixes`
2. Implement fixes in order of priority
3. Run tests after each major change: `pnpm test`
4. Build all packages: `pnpm build`
5. Test locally with: `pnpm dev:core`, `pnpm dev:web`, etc.
6. Commit with descriptive messages
7. Create PR for review
8. Merge after approval

---

## 📚 ADDITIONAL RECOMMENDATIONS

### Future Enhancements (not in scope):
1. Add comprehensive test suite (Jest/Vitest)
2. Implement OpenAPI/Swagger documentation
3. Add monitoring and observability (Prometheus, Grafana)
4. Implement proper key management (OS keychain integration)
5. Add HTTPS support for production
6. Create deployment guides (Docker, systemd, etc.)
7. Add telemetry and analytics
8. Implement backup/restore functionality

### Security Audit Recommendations:
1. Conduct third-party security audit
2. Implement secrets scanning in CI/CD
3. Add dependency vulnerability scanning
4. Review and update all dependencies regularly
5. Implement Content Security Policy for web dashboard

---

## ⚠️ CAUTIONS

1. **Backup Database:** Before running fixes, backup `~/.sigil/` directory
2. **Test Thoroughly:** Test each fix in isolation before moving to next
3. **Version Control:** Commit after each working fix
4. **User Communication:** If making breaking changes, update version and notify users
5. **Dependencies:** Some fixes require new dependencies - review licenses

---

**End of Instructions**

Generated by comprehensive code review on March 4, 2026.
For questions or issues, refer to the original code review report.
