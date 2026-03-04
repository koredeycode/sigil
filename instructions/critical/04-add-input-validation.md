# Fix 04: Add Input Validation with Zod

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium

## 📋 Overview

**Files:** `packages/core/src/server/routes/*.ts`

**Issue:** API endpoints lack proper input validation. No schema validation, missing length checks, and no sanitization of user inputs before passing to LLM.

**Impact:** 
- Security vulnerabilities
- Potential injection attacks
- Poor error messages for invalid inputs
- Data integrity issues

## 🎯 Objective

Implement comprehensive input validation using Zod schemas for all API endpoints.

## 📝 Step-by-Step Instructions

### Step 1: Verify Zod is Available

Check that Zod is in dependencies:

```bash
cd packages/core
grep "zod" package.json
```

Should show: `"zod": "^3.25.76"` or similar. If not, install it:

```bash
pnpm add zod
```

### Step 2: Create Validation Schemas

**Create file:** `packages/core/src/server/schemas.ts`

```typescript
import { z } from 'zod';

// Extension routes
export const simulateTransactionSchema = z.object({
  transactionMessage: z.string()
    .min(1, 'Transaction message is required')
    .max(100000, 'Transaction message too large'),
  origin: z.string()
    .url('Invalid origin URL')
    .optional(),
});

export const signTransactionSchema = z.object({
  transactionMessage: z.string()
    .min(1, 'Transaction message is required')
    .max(100000, 'Transaction message too large'),
});

// Chat routes
export const chatMessageSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long (max 10000 characters)'),
  includeHistory: z.boolean()
    .optional()
    .default(false),
});

// Agent routes
export const createAgentSchema = z.object({
  name: z.string()
    .min(1, 'Agent name is required')
    .max(100, 'Agent name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Agent name can only contain letters, numbers, hyphens, and underscores'),
  loopInterval: z.number()
    .int('Loop interval must be an integer')
    .min(5000, 'Loop interval must be at least 5 seconds')
    .max(3600000, 'Loop interval cannot exceed 1 hour')
    .optional(),
  prompt: z.string()
    .max(5000, 'Prompt too long (max 5000 characters)')
    .optional()
    .nullable(),
});

export const updateAgentSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  loopInterval: z.number()
    .int()
    .min(5000)
    .max(3600000)
    .optional(),
  status: z.enum(['running', 'paused'])
    .optional(),
  prompt: z.string()
    .max(5000)
    .optional()
    .nullable(),
});

// Provider routes
export const addProviderSchema = z.object({
  name: z.string()
    .min(1, 'Provider name is required'),
  apiKey: z.string()
    .min(1, 'API key is required')
    .max(500, 'API key too long'),
  model: z.string()
    .min(1, 'Model is required'),
  baseUrl: z.string()
    .url('Invalid base URL')
    .optional(),
  compat: z.enum(['openai', 'anthropic'])
    .optional()
    .default('openai'),
});

export const updateProviderSchema = z.object({
  name: z.string().min(1).optional(),
  apiKey: z.string().min(1).max(500).optional(),
  model: z.string().min(1).optional(),
  baseUrl: z.string().url().optional().nullable(),
  compat: z.enum(['openai', 'anthropic']).optional(),
});

// Config routes
export const updateConfigSchema = z.object({
  kill_switch: z.enum(['true', 'false']).optional(),
  per_trade_limit: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Must be a valid number')
    .optional(),
  daily_volume_cap: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Must be a valid number')
    .optional(),
  slippage_cap: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Must be a valid number')
    .optional(),
  cooldown_period: z.string()
    .regex(/^\d+$/, 'Must be a valid integer')
    .optional(),
  confirmation_threshold: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Must be a valid number')
    .optional(),
  rpc_url: z.string()
    .url('Invalid RPC URL')
    .optional(),
});

// Cron job routes
export const createCronJobSchema = z.object({
  name: z.string()
    .min(1, 'Job name is required')
    .max(100, 'Job name too long'),
  expression: z.string()
    .min(1, 'Cron expression is required')
    .regex(/^(\*|([0-5]?\d)) (\*|([0-5]?\d)) (\*|(1?\d|2[0-3])) (\*|([1-2]?\d|3[01])) (\*|([0-6]|sun|mon|tue|wed|thu|fri|sat)) (\*|([0-6]|sun|mon|tue|wed|thu|fri|sat))$/i, 'Invalid cron expression'),
  taskPrompt: z.string()
    .min(1, 'Task prompt is required')
    .max(2000, 'Task prompt too long'),
});

export const updateCronJobSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  expression: z.string().min(1).optional(),
  taskPrompt: z.string().min(1).max(2000).optional(),
});

// Wallet routes
export const requestAirdropSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(10, 'Cannot request more than 10 SOL in one airdrop'),
});
```

### Step 3: Create Validation Middleware

**Create file:** `packages/core/src/server/middleware/validate.ts`

```typescript
import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../../lib/Logger.js';

/**
 * Middleware to validate request body against a Zod schema.
 * Returns 400 with detailed error messages if validation fails.
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and validate the request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors for client
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn('Validation error', {
          path: req.path,
          errors,
        });

        res.status(400).json({
          message: 'Validation error',
          errors,
          data: null,
        });
        return;
      }

      // Unknown error
      logger.error('Unexpected validation error', error);
      res.status(500).json({
        message: 'Internal validation error',
        data: null,
      });
    }
  };
}

/**
 * Middleware to validate query parameters.
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Query validation error', {
          path: req.path,
          errors,
        });

        res.status(400).json({
          message: 'Invalid query parameters',
          errors,
          data: null,
        });
        return;
      }

      next(error);
    }
  };
}
```

### Step 4: Apply Validation to Extension Routes

**File:** `packages/core/src/server/routes/extension.ts`

```typescript
// Add imports at the top:
import { validateBody } from '../middleware/validate.js';
import { simulateTransactionSchema, signTransactionSchema } from '../schemas.js';

// Apply validation to POST /simulate route (around line 107):
extensionRouter.post('/simulate', validateBody(simulateTransactionSchema), async (req, res) => {
  try {
    // At this point, req.body is validated and typed
    const { transactionMessage, origin } = req.body;
    // ... rest of existing code
  } catch (error) {
    // ... existing error handler
  }
});

// Apply validation to POST /sign route (around line 190):
extensionRouter.post('/sign', validateBody(signTransactionSchema), async (req, res) => {
  try {
    const { transactionMessage } = req.body;
    // ... rest of existing code
  } catch (error) {
    // ... existing error handler
  }
});
```

### Step 5: Apply Validation to Chat Routes

**File:** `packages/core/src/server/routes/chat.ts`

```typescript
// Add imports:
import { validateBody } from '../middleware/validate.js';
import { chatMessageSchema } from '../schemas.js';

// Apply to POST / route (around line 10):
chatRouter.post('/', validateBody(chatMessageSchema), async (req, res) => {
  try {
    const { message, includeHistory } = req.body;
    // ... rest of existing code
  } catch (error) {
    // ... existing error handler
  }
});
```

### Step 6: Apply Validation to Agent Routes

**File:** `packages/core/src/server/routes/agents.ts`

```typescript
// Add imports:
import { validateBody } from '../middleware/validate.js';
import { createAgentSchema, updateAgentSchema } from '../schemas.js';

// Apply to POST / route (create agent):
agentsRouter.post('/', validateBody(createAgentSchema), async (req, res) => {
  try {
    const { name, loopInterval, prompt } = req.body;
    // ... rest of existing code
  } catch (error) {
    // ... existing error handler
  }
});

// Apply to PATCH /:id route (update agent):
agentsRouter.patch('/:id', validateBody(updateAgentSchema), async (req, res) => {
  try {
    const { name, loopInterval, status, prompt } = req.body;
    // ... rest of existing code
  } catch (error) {
    // ... existing error handler
  }
});
```

### Step 7: Apply Validation to Provider Routes

**File:** `packages/core/src/server/routes/providers.ts`

```typescript
// Add imports:
import { validateBody } from '../middleware/validate.js';
import { addProviderSchema, updateProviderSchema } from '../schemas.js';

// Apply to POST / route:
providersRouter.post('/', validateBody(addProviderSchema), async (req, res) => {
  try {
    const { name, apiKey, model, baseUrl, compat } = req.body;
    // ... rest of existing code
  } catch (error) {
    // ... existing error handler
  }
});

// Apply to PATCH /:id route:
providersRouter.patch('/:id', validateBody(updateProviderSchema), async (req, res) => {
  try {
    // ... rest of existing code
  } catch (error) {
    // ... existing error handler
  }
});
```

### Step 8: Apply Validation to Config Routes

**File:** `packages/core/src/server/routes/config.ts`

```typescript
// Add imports:
import { validateBody } from '../middleware/validate.js';
import { updateConfigSchema } from '../schemas.js';

// Apply to PATCH / route:
configRouter.patch('/', validateBody(updateConfigSchema), async (req, res) => {
  try {
    // ... rest of existing code
  } catch (error) {
    // ... existing error handler
  }
});
```

### Step 9: Apply Validation to Cron Routes

**File:** `packages/core/src/server/routes/cron.ts`

```typescript
// Add imports:
import { validateBody } from '../middleware/validate.js';
import { createCronJobSchema, updateCronJobSchema } from '../schemas.js';

// Apply validations to the appropriate routes
```

### Step 10: Apply Validation to Wallet Routes

**File:** `packages/core/src/server/routes/wallet.ts`

```typescript
// Add imports:
import { validateBody } from '../middleware/validate.js';
import { requestAirdropSchema } from '../schemas.js';

// Apply to airdrop route if it exists
```

### Step 11: Build and Test

```bash
cd packages/core
pnpm build
```

## ✅ Verification

### Test Invalid Inputs:

Use curl or Postman to test validation:

```bash
# Test with missing field:
curl -X POST http://localhost:7445/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Should return 400 with validation errors

# Test with invalid agent name:
curl -X POST http://localhost:7445/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "invalid name with spaces"}'

# Should return 400 with regex validation error

# Test with message too long:
curl -X POST http://localhost:7445/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$(printf 'a%.0s' {1..10001})\"}"

# Should return 400 with length error
```

### Check Valid Inputs Still Work:

```bash
# Test valid chat message:
curl -X POST http://localhost:7445/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what is my balance?"}'

# Should return 200 with response
```

### Expected Results:
- ✅ Invalid inputs rejected with 400 status
- ✅ Clear error messages indicating what's wrong
- ✅ Valid inputs work as before
- ✅ No SQL injection possible
- ✅ Build succeeds

## 🐛 Troubleshooting

### Error: "Cannot find module 'zod'"
**Solution:** Install it: `pnpm add zod`

### Validation Always Fails
**Solution:** 
1. Check request body format matches schema
2. Verify Content-Type header is application/json
3. Check for typos in field names

### Schema Too Strict
**Solution:** Adjust the schema constraints (min, max, regex) as needed for your use case.

## 📝 Commit Message

```bash
git add packages/core/src/server/schemas.ts
git add packages/core/src/server/middleware/validate.ts
git add packages/core/src/server/routes/
git commit -m "feat(server): add comprehensive input validation with Zod

- Create validation schemas for all API endpoints
- Implement validateBody middleware
- Apply validation to extension, chat, agent, provider, config routes
- Add detailed error messages for validation failures
- Prevent injection attacks and data integrity issues

Closes #4"
```

## 🎉 Critical Fixes Complete!

Congratulations! You've completed all 4 critical fixes. The codebase is now much more secure and type-safe.

## ⏭️ Next Steps

Move to high priority fixes:
**`high/05-implement-rate-limiting.md`**
