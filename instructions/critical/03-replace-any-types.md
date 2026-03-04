# Fix 03: Replace `any` Types with Proper Types

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 2-3 hours  
**Difficulty:** Medium-Hard

## 📋 Overview

**Files:** Multiple (40+ occurrences throughout codebase)

**Issue:** Excessive use of `any` type, defeating TypeScript's type safety benefits, especially in:
- Error catch blocks (`catch (e: any)`)
- API response parsing
- Model fetching functions

**Impact:** Loss of type safety, potential runtime errors, poor IDE support.

## 🎯 Objective

Replace `any` types with proper TypeScript types or `unknown` with type guards where appropriate.

## 📝 Step-by-Step Instructions

### Step 1: Fix Error Handler Types

**Pattern to Replace:** `catch (e: any)` or `catch (err: any)`

#### Strategy A: Use Unknown with Type Guard (Preferred)

```typescript
// OLD:
} catch (e: any) {
  console.error('Error:', e.message);
}

// NEW:
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  logger.error('Operation failed', { message, error });
}
```

#### Apply to These Files:

1. **`packages/core/src/server/routes/extension.ts`** (multiple locations)
2. **`packages/core/src/agent/OrchestratorTools.ts`** (lines 40, 60, 81, 97)
3. **`packages/core/bin/commands/status.ts`** (line 25)
4. **`packages/core/bin/commands/stop.ts`** (line 22)
5. **`packages/core/bin/commands/health.ts`** (line 24)

### Step 2: Fix ModelFetcher Types

**File:** `packages/core/src/lib/ModelFetcher.ts`

Add proper interfaces at the top of the file:

```typescript
// Add these interfaces after imports:
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
  supportedGenerationMethods?: string[];
}

// Update the PROVIDER_ENDPOINTS type:
const PROVIDER_ENDPOINTS: Record<string, { 
  url: string; 
  parseModels: (data: unknown) => ModelInfo[] 
}> = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    parseModels: (data: unknown): ModelInfo[] => {
      if (!data || typeof data !== 'object' || !('data' in data)) {
        return [];
      }
      const models = (data as { data?: unknown[] }).data || [];
      return models
        .filter((m): m is OpenAIModel => 
          typeof m === 'object' && 
          m !== null && 
          'id' in m && 
          typeof (m as any).id === 'string' &&
          (m as OpenAIModel).id.startsWith('gpt-')
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((m) => ({ id: m.id, label: m.id }));
    },
  },
  
  anthropic: {
    url: 'https://api.anthropic.com/v1/models',
    parseModels: (data: unknown): ModelInfo[] => {
      if (!data || typeof data !== 'object' || !('data' in data)) {
        return [];
      }
      const models = (data as { data?: unknown[] }).data || [];
      return models
        .filter((m): m is AnthropicModel => 
          typeof m === 'object' && 
          m !== null && 
          'id' in m &&
          !(m as any).id.includes('whisper') &&
          !(m as any).id.includes('safeguard')
        )
        .sort((a, b) => (a as any).id.localeCompare((b as any).id))
        .map((m) => ({ 
          id: (m as any).id, 
          label: (m as any).id 
        }));
    },
  },
  
  groq: {
    url: 'https://api.groq.com/openai/v1/models',
    parseModels: (data: unknown): ModelInfo[] => {
      if (!data || typeof data !== 'object' || !('data' in data)) {
        return [];
      }
      const models = (data as { data?: unknown[] }).data || [];
      return models
        .filter((m): m is GroqModel => 
          typeof m === 'object' && m !== null && 'id' in m
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((m) => ({ 
          id: m.id, 
          label: m.display_name ?? m.id 
        } as any));
    },
  },
  
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    parseModels: (data: unknown): ModelInfo[] => {
      if (!data || typeof data !== 'object' || !('models' in data)) {
        return [];
      }
      const models = (data as { models?: unknown[] }).models || [];
      return models
        .filter((m): m is GoogleModel => 
          typeof m === 'object' && 
          m !== null && 
          'name' in m &&
          typeof (m as any).name === 'string' &&
          (m as GoogleModel).name.includes('gemini')
        )
        .map((m) => ({
          id: m.name,
          label: m.displayName || m.name,
        }));
    },
  },
};
```

Update the error handler at line 113:

```typescript
// OLD:
} catch (err: any) {
  return [];
}

// NEW:
} catch (error) {
  logger.error('Failed to fetch models', { provider, error });
  return [];
}
```

### Step 3: Fix API Response Type

**File:** `packages/core/src/server/types.ts`

```typescript
// OLD:
export interface ApiResponse<T = any> {
  message: string;
  data: T | null;
  error?: string;
}

// NEW:
export interface ApiResponse<T = unknown> {
  message: string;
  data: T | null;
  error?: string;
}
```

### Step 4: Fix Transaction Instruction Type

**File:** `packages/core/src/server/routes/wallet.ts` (around line 115)

Add interface before the route handler:

```typescript
interface SolanaInstruction {
  programId: {
    toBase58(): string;
  };
  keys: Array<{
    pubkey: { toBase58(): string };
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: Buffer;
}

// Then in the route (line 115):
instructions: tx.transaction.message.instructions.map((ix: SolanaInstruction) => ({
  programId: ix.programId.toBase58(),
  keys: ix.keys.map(k => ({
    pubkey: k.pubkey.toBase58(),
    isSigner: k.isSigner,
    isWritable: k.isWritable,
  })),
  data: ix.data.toString('hex'),
})),
```

### Step 5: Fix Agent Loop Any Types

**File:** `packages/core/src/agent/AgentLoop.ts` (line 138)

```typescript
// OLD:
tool: (msg as any).name || 'unknown',

// NEW:
tool: ('name' in msg ? (msg as { name: string }).name : 'unknown'),
```

### Step 6: Fix OrchestratorTools Error Handlers

**File:** `packages/core/src/agent/OrchestratorTools.ts`

Replace all four occurrences (lines 40, 60, 81, 97):

```typescript
// OLD:
} catch (e: any) {
  return `Error: ${e.message}`;
}

// NEW:
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return `Error: ${message}`;
}
```

### Step 7: Fix Routes Error Handlers

Update all route files in `packages/core/src/server/routes/`:

#### Pattern to follow:

```typescript
// For all catch blocks in route handlers:
} catch (error) {
  const message = error instanceof Error ? error.message : 'An error occurred';
  logger.error('Route error', { route: req.path, error });
  res.status(500).json({ 
    message, 
    data: null 
  });
}
```

Apply this to:
- `agents.ts` - multiple catch blocks
- `chat.ts` - multiple catch blocks  
- `config.ts`
- `cron.ts`
- `extension.ts` - multiple catch blocks
- `providers.ts`
- `transactions.ts`
- `wallet.ts`

### Step 8: Search and Replace Remaining Any Types

```bash
# Search for remaining 'any' usage:
cd packages/core
grep -rn ": any" src/ --include="*.ts"

# Review each occurrence and fix appropriately
```

### Step 9: Build and Fix Compilation Errors

```bash
cd packages/core
pnpm build
```

Address any new TypeScript errors that appear from removing `any` types.

## ✅ Verification

### Check for Remaining Issues:

```bash
# Search for any remaining 'any' types:
grep -r ": any" packages/core/src/ --include="*.ts" | grep -v "node_modules"

# Should see minimal results, mainly in legitimate cases
```

### Build Successfully:

```bash
cd packages/core
pnpm build
```

Should complete without errors.

### Run TypeScript Compiler:

```bash
cd packages/core
pnpm tsc --noEmit
```

Should pass with no errors.

### Expected Results:
- ✅ No `any` types in error handlers
- ✅ Proper interfaces for external API responses
- ✅ Type guards for unknown data
- ✅ Build succeeds
- ✅ Better IDE autocomplete

## 🐛 Troubleshooting

### Error: "Type 'unknown' is not assignable to..."
**Solution:** Add proper type guard:
```typescript
if (typeof value === 'string') {
  // value is now string
}
```

### Too Many Type Errors After Changing `any`
**Solution:** 
1. Use `unknown` as intermediate step
2. Add type guards gradually
3. Use type assertions sparingly with `as` keyword

### Can't Determine Proper Type
**Solution:** 
1. Console.log the value to see actual structure
2. Use browser/Node debugger
3. Check API documentation
4. Use `unknown` and validate at runtime

## 📚 Reference: Type Guard Patterns

```typescript
// Check if Error
if (error instanceof Error) {
  error.message // safe to access
}

// Check if object with property
if (typeof obj === 'object' && obj !== null && 'prop' in obj) {
  // obj has property 'prop'
}

// Check if string
if (typeof value === 'string') {
  value.toUpperCase() // safe
}

// Check if array
if (Array.isArray(value)) {
  value.map(...) // safe
}

// Custom type guard
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && 
         obj !== null && 
         'name' in obj && 
         'email' in obj;
}
```

## 📝 Commit Message

```bash
git add packages/core/src/
git commit -m "refactor(core): replace any types with proper TypeScript types

- Replace catch (e: any) with proper error handling
- Add interfaces for external API responses (OpenAI, Anthropic, etc.)
- Replace any with unknown and type guards where appropriate
- Fix ModelFetcher with proper type definitions
- Update API response types from any to unknown
- Add type guards for runtime validation

Closes #3"
```

## ⏭️ Next Step

After completing this fix, move to:
**`critical/04-add-input-validation.md`**
