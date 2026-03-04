# Fix 02: Implement Proper Logger

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium

## 📋 Overview

**Files:** Multiple (50+ occurrences across `packages/core/`)

**Issue:** Console.log statements throughout the codebase, including logging of sensitive operations like agent invocations, token usage, and potentially private keys.

**Impact:** 
- Security risk: Sensitive data in logs
- Production issues: No log level control
- Debugging difficulty: Unstructured logging

## 🎯 Objective

Replace all console.log/error/warn statements with a proper centralized logger that supports log levels, structured output, and can be configured for different environments.

## 📝 Step-by-Step Instructions

### Step 1: Create the Logger Utility

**Create file:** `packages/core/src/lib/Logger.ts`

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

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const logMessage = this.formatMessage(level, message, data);

    if (this.config.enableConsole) {
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](logMessage);
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
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    this.log('error', message, errorData);
  }
}

export const logger = new Logger();
export default logger;
```

### Step 2: Export from Core Package

**File:** `packages/core/src/index.ts`

Add this export at the end:

```typescript
export { logger } from './lib/Logger.js';
```

### Step 3: Replace Console Logs in Server Files

**Files:** `packages/core/src/server/**/*.ts`

#### In `packages/core/src/server/app.ts`:

```typescript
// Add import at top:
import { logger } from '../lib/Logger.js';

// Replace line ~48:
// OLD:
console.info(`[API Request] ${req.method} ${req.originalUrl} - ${res.statusCode} (${ms}ms)`);

// NEW:
logger.info(`API Request: ${req.method} ${req.originalUrl}`, {
  statusCode: res.statusCode,
  duration: `${ms}ms`
});

// Replace line ~109:
// OLD:
console.log(`\n  ⎔ Sigil Server (API + Web) running on http://localhost:${API_PORT}`);

// NEW:
logger.info(`Sigil Server running on http://localhost:${API_PORT}`);

// Replace line ~72:
// OLD:
console.error('[Server Error]', err.message);

// NEW:
logger.error('Server error:', err);
```

### Step 4: Replace Console Logs in Agent Files

**File:** `packages/core/src/agent/AgentLoop.ts`

```typescript
// Add import:
import { logger } from '../lib/Logger.js';

// Replace line ~76:
// OLD:
console.info(`[AgentLoop:${agentName}] Invoking with message: ${message.substring(0, 100)}...`);

// NEW:
logger.info(`AgentLoop invoked for ${agentName}`, {
  messagePreview: message.substring(0, 100)
});

// Replace lines ~113-118:
// OLD:
console.info(
  `[Token Usage:${agentName}] Input: ${usage.promptTokens} | Output: ${usage.completionTokens} | Total: ${usage.totalTokens}`
);

// NEW:
logger.info(`Token usage for ${agentName}`, {
  input: usage.promptTokens,
  output: usage.completionTokens,
  total: usage.totalTokens
});
```

### Step 5: Replace Console Logs in Extension Routes

**File:** `packages/core/src/server/routes/extension.ts`

```typescript
// Add import:
import { logger } from '../../lib/Logger.js';

// Replace line ~139:
// OLD:
console.error(`[Extension API] Failed to decode transaction for simulation:`, e);

// NEW:
logger.error('Failed to decode transaction for simulation', e);

// Replace line ~145:
// OLD:
console.log(`[Extension API] Passing transaction to Agent '${mainAgent.name}' for risk analysis...`);

// NEW:
logger.info(`Passing transaction to agent for risk analysis`, {
  agentName: mainAgent.name,
  origin
});

// Replace similar patterns throughout the file
```

### Step 6: Handle CLI Commands (Keep Console for User Output)

**Files:** `packages/core/bin/commands/*.ts`

**Important:** In CLI commands, **KEEP** console.log for user-facing output, but replace internal logging:

```typescript
// KEEP (user-facing):
console.log(`\n  ⎔ Sigil Agent\n`);
console.log(`  Name:     ${a.name}`);

// REPLACE (internal logging):
// OLD:
console.error('Failed to initialize agent:', error);

// NEW:
logger.error('Failed to initialize agent', error);
console.log('Error: Failed to initialize agent. Check logs for details.');
```

### Step 7: Critical - Fix test-key.ts

**File:** `packages/core/test-key.ts`

**CRITICAL SECURITY FIX:**

```typescript
// OLD (SECURITY RISK):
console.log('Private Key:', bs58.encode(keypair.secretKey));

// NEW (if keeping file):
import { logger } from './src/lib/Logger.js';
logger.info('Keypair generated successfully', {
  publicKey: keypair.publicKey.toBase58()
  // DO NOT LOG PRIVATE KEY
});

// OR BETTER: Delete this file entirely (recommended)
```

### Step 8: Replace in Background Services

**File:** `packages/core/src/agent/AgentManager.ts`

```typescript
// Add import
import { logger } from '../lib/Logger.js';

// Find and replace console statements with logger
// Search for: console.log
// Search for: console.error
// Search for: console.warn
```

### Step 9: Systematic Replacement

Use this search and replace pattern across all `packages/core/src/` files:

```bash
# From the root directory:
cd packages/core

# Find all console.log usage (for reference):
grep -r "console\." src/ --include="*.ts"

# Manual replacement needed - cannot use automated find/replace
# because context matters
```

For each occurrence:
1. Determine if it's user-facing CLI output (keep console) or internal logging (use logger)
2. Replace appropriately
3. Add contextual data as second parameter when useful

### Step 10: Build and Test

```bash
cd packages/core
pnpm build

# Test that logging works:
pnpm start
```

## ✅ Verification

### Check Build:
```bash
cd packages/core
pnpm build
```

Should complete without errors.

### Test Logger Output:

Run the server and verify logs appear:
```bash
pnpm start
```

You should see formatted log messages like:
```
[2026-03-04T10:30:00.123Z] [INFO] Sigil Server running on http://localhost:7445
[2026-03-04T10:30:15.456Z] [INFO] API Request: GET /api/status {"statusCode":200,"duration":"5ms"}
```

### Verify No Private Keys in Logs:

1. Search all logs for base58-encoded strings (58 characters)
2. Ensure no private keys are logged
3. Check test-key.ts is fixed or deleted

### Expected Results:
- ✅ All console.log replaced in src/ directory
- ✅ CLI user output still uses console (in bin/commands/)
- ✅ Structured logging with timestamps
- ✅ No private keys in logs
- ✅ Log level control available

## 🐛 Troubleshooting

### Error: "Cannot find module './lib/Logger.js'"
**Solution:** Make sure you created the file with correct path and extension (.ts)

### Logs Not Appearing
**Solution:** Check that log level is set correctly. Default is 'info', so debug logs won't appear.

### Build Fails After Changes
**Solution:** 
1. Check all imports use `.js` extension (required for ESM)
2. Verify Logger.ts exports correctly
3. Run `pnpm build` to see specific errors

## 📝 Commit Message

```bash
git add packages/core/src/lib/Logger.ts
git add packages/core/src/index.ts
git add packages/core/src/server/
git add packages/core/src/agent/
git commit -m "feat(core): implement centralized logger system

- Create Logger utility with log levels (debug, info, warn, error)
- Replace console.log with logger in server and agent code
- Add structured logging with timestamps and context
- Fix security issue: remove private key logging
- Keep console.log in CLI commands for user-facing output

Closes #2"
```

## 🔒 Security Note

**CRITICAL:** Ensure that `test-key.ts` no longer logs private keys. Either:
1. Delete the file (recommended)
2. Or remove the private key console.log line

## ⏭️ Next Step

After completing this fix, move to:
**`critical/03-replace-any-types.md`**
