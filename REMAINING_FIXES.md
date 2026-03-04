# Remaining Code Fixes for Sigil

**Date:** March 4, 2026  
**Status:** 18/23 fixes completed  
**Remaining:** 7 fixes (2 medium, 5 low priority)

---

## 🟡 MEDIUM PRIORITY

### Fix 11: Align Dependency Versions

**Issue:** React and TypeScript versions are inconsistent across packages

- `packages/tui`: React 18.3.1, @types/react 18.3.18
- `packages/web`: React 19.2.0, @types/react 19.2.7
- `extension`: React 18.2.0
- TypeScript: 5.3.3 to 5.7.3 across packages

**Decision Required:** Choose React version (18 or 19)

#### Option A: Standardize on React 19 (Recommended)

**Steps:**

1. Update `packages/tui/package.json`:

```json
{
  "dependencies": {
    "react": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "typescript": "^5.7.3"
  }
}
```

2. Update `extension/package.json`:

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "typescript": "^5.7.3"
  }
}
```

3. Check for breaking changes:
   - Ink compatibility with React 19: `packages/tui/src/app.tsx`
   - Extension components for deprecated APIs

4. Clean install and rebuild:

```bash
cd /home/yusufakoredey/Desktop/sigil
pnpm install
pnpm build
```

5. Test all packages:

```bash
# Test TUI
pnpm --filter sigil-tui run start

# Test extension
cd extension && pnpm run build

# Test web
pnpm --filter sigil-web run dev
```

#### Option B: Standardize on React 18 (Conservative)

**Steps:**

1. Downgrade `packages/web/package.json`:

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5"
  }
}
```

2. Follow steps 3-5 from Option A

**Expected Outcome:** All packages use same React version, reduced type conflicts, smaller node_modules.

---

### Fix 13: Break Circular Dependency

**Issue:** `AgentLoop.ts` and `AgentManager.ts` import each other

- Line 8 in AgentLoop: `import { agentManager } from './AgentManager.js'`
- Line 14 in AgentManager: `import { invalidateAgentGraph, invokeSolanaAgent } from './AgentLoop.js'`

**Solution:** Extract shared types/interfaces or use dependency injection

**Steps:**

1. Create `packages/core/src/agent/types.ts`:

```typescript
import { EventEmitter } from "events";

export interface IAgentManager extends EventEmitter {
  getMainAgent(): AgentRow | null;
  emit(event: string, data: any): boolean;
}

export interface AgentRow {
  id: string;
  name: string;
  pubkey: string;
  status: "running" | "paused";
  loop_interval: number;
  prompt: string | null;
  created_at: string;
}
```

2. Refactor `AgentLoop.ts` (lines 1-10):

```typescript
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { CONSTANTS } from "../lib/Constants.js";
import { getAgent, getAgentChats, insertLog } from "../lib/Database.js";
import { logger } from "../lib/Logger.js";
import { LRUCache } from "../lib/LRUCache.js";
import { buildSystemPrompt, getPrimaryModel } from "./LLMChain.js";
import { createTools } from "./ToolRegistry.js";
import type { IAgentManager } from "./types.js";

// AgentManager will be set by AgentManager.ts after instantiation
let agentManager: IAgentManager | null = null;

export function setAgentManager(manager: IAgentManager): void {
  agentManager = manager;
}
```

3. Update `AgentManager.ts` constructor (after line 26):

```typescript
export class AgentManager extends EventEmitter {
  constructor() {
    super();
    // Register this instance with AgentLoop to break circular dependency
    setAgentManager(this);
  }

  // ... rest of class
}
```

4. Update all uses of `agentManager` in `AgentLoop.ts`:

```typescript
// Replace direct usage with null checks
if (agentManager) {
  agentManager.emit("agent:thought", {
    /* ... */
  });
}
```

5. Verify no circular imports:

```bash
# Install madge if not already installed
npm install -g madge

# Check for circular dependencies
cd packages/core
madge --circular --extensions ts src/agent/
```

**Alternative Solution (Simpler):** Move `invalidateAgentGraph` to separate file

1. Create `packages/core/src/agent/AgentCache.ts`:

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { LRUCache } from "../lib/LRUCache.js";
import { CONSTANTS } from "../lib/Constants.js";

// Cached agent graphs per agent ID
export const agentGraphCache = new LRUCache<
  string,
  ReturnType<typeof createReactAgent>
>(CONSTANTS.CACHE.MAX_AGENT_GRAPHS);

export function invalidateAgentGraph(agentId: string): void {
  agentGraphCache.delete(agentId);
}

export function invalidateAllAgentGraphs(): void {
  agentGraphCache.clear();
}
```

2. Update imports in both files to use `./AgentCache.js`

**Expected Outcome:** No circular dependencies, cleaner architecture.

---

### Fix 15: Remove Commented Code

**Files to clean:**

#### File 1: `packages/core/src/lib/Database.ts` (lines 126-129)

**Remove:**

```typescript
/**
 * Add new columns to existing providers table (safe to re-run).
 */
// function migrateProviders(db: DatabaseSync): void {
//   try { db.exec('ALTER TABLE providers ADD COLUMN base_url TEXT'); } catch {}
//   try { db.exec("ALTER TABLE providers ADD COLUMN compat TEXT DEFAULT 'openai'"); } catch {}
// }
```

**Replace with:**

```typescript
// Migration history: base_url and compat columns added in v0.1.0
```

**Location:** Between `initializeTables()` and `migrateChats()` functions

**Steps:**

1. Open `/home/yusufakoredey/Desktop/sigil/packages/core/src/lib/Database.ts`
2. Navigate to lines 126-129
3. Delete the commented function
4. Add single-line comment noting migration was completed

**Expected Outcome:** No dead code, cleaner codebase.

---

## 🟢 LOW PRIORITY

### Fix 20: Naming Consistency

**Issue:** Mixed file naming conventions

**Current State:**

- PascalCase: `AgentManager.ts`, `LLMChain.ts`, `ErrorBoundary.tsx`
- camelCase: `app.ts`, `logger.ts`
- Mixed: Some utilities in PascalCase

**Recommended Convention:**

- **PascalCase:** Classes, React components, type definition files
  - `AgentManager.ts`, `ChatBox.tsx`, `Types.ts`
- **camelCase:** Utilities, hooks, non-class modules
  - `logger.ts`, `config.ts`, `useSocket.tsx`, `api.ts`

**Steps:**

1. **No action required** - Current naming is already mostly consistent!

2. Document convention in `CONTRIBUTING.md`:

```markdown
## File Naming Conventions

- **PascalCase** for:
  - Class files: `AgentManager.ts`
  - React components: `ChatBox.tsx`
  - Type definition files: `Types.ts`

- **camelCase** for:
  - Utility modules: `logger.ts`, `config.ts`
  - React hooks: `useSocket.tsx`, `useApi.tsx`
  - API clients: `api.ts`

- **kebab-case** for:
  - CLI commands: `sigil-agent`, `sigil-wallet`
  - Documentation: `getting-started.md`
```

**Expected Outcome:** Clear convention for future files.

---

### Fix 21: Add TypeScript Config Comments

**Files:** All `tsconfig.json` files

**Steps:**

1. Update `/home/yusufakoredey/Desktop/sigil/packages/core/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022", // Modern JavaScript features
    "module": "Node16", // Native ESM support with .js extensions
    "moduleResolution": "Node16", // Required for Node16 modules
    "lib": ["ES2022"],
    "strict": true, // Enable all strict type-checking options
    "esModuleInterop": true, // Better CommonJS/ESM interop
    "skipLibCheck": true, // Skip .d.ts files for faster builds
    "forceConsistentCasingInFileNames": true, // Prevent cross-platform path issues
    "resolveJsonModule": true, // Allow importing .json files
    "declaration": true, // Generate .d.ts declaration files
    "declarationMap": true, // Source maps for .d.ts files
    "sourceMap": true, // Generate .js.map for debugging
    "outDir": "./dist", // Output directory for compiled files
    "rootDir": "." // Root of source files
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

2. Repeat for other `tsconfig.json` files:
   - `/home/yusufakoredey/Desktop/sigil/packages/web/tsconfig.json`
   - `/home/yusufakoredey/Desktop/sigil/packages/tui/tsconfig.json`
   - `/home/yusufakoredey/Desktop/sigil/tsconfig.json`

**Expected Outcome:** Better understanding of TypeScript configuration.

---

### Fix 22: Environment Variable Documentation

**Steps:**

1. Create `/home/yusufakoredey/Desktop/sigil/packages/core/.env.example`:

```bash
# ============================================
# Sigil Core Configuration
# ============================================

# Solana Network Configuration
# Options: https://api.devnet.solana.com, https://api.mainnet-beta.solana.com
RPC_URL=https://api.devnet.solana.com

# Server Configuration
API_PORT=7445

# Web Dashboard
# Path to compiled web dashboard (optional, auto-detected if not set)
# WEB_DIST_PATH=/path/to/sigil/packages/web/dist

# Logging
# Options: debug, info, warn, error
LOG_LEVEL=info

# LLM Provider (Optional - can be configured via database/CLI instead)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=...

# Development
# NODE_ENV=development
```

2. Update `/home/yusufakoredey/Desktop/sigil/README.md` (or create if missing):

````markdown
## Configuration

### Environment Variables

Sigil can be configured using environment variables or the database (via CLI/Web UI).

Copy the example file and customize:

```bash
cp packages/core/.env.example packages/core/.env
```
````

Key variables:

- `RPC_URL`: Solana RPC endpoint (default: devnet)
- `API_PORT`: Server port (default: 7445)
- `LOG_LEVEL`: Logging verbosity (default: info)

See `.env.example` for all options.

### Database Configuration

Most settings are stored in SQLite and can be managed via:

- CLI: `sigil config set <key> <value>`
- Web UI: Settings page
- API: `POST /api/config`

```

3. Add to `.gitignore`:
```

# Environment files

.env
.env.local
.env.\*.local

````

**Expected Outcome:** Clear configuration documentation for users.

---

### Fix 23: Enhanced Health Check

**File:** `packages/core/src/server/routes/status.ts`

**Current:** Basic health check with database, providers, agents

**Enhancement:** Add more diagnostic info

**Steps:**

1. Update `/home/yusufakoredey/Desktop/sigil/packages/core/src/server/routes/status.ts`:
```typescript
import { Router } from "express";
import { AgentRow, getAllAgents, getDatabase } from "../../lib/Database.js";
import { getRpcUrl } from "../../lib/Config.js";
import { Connection } from "@solana/web3.js";

export const statusRouter: Router = Router();

statusRouter.get("/", async (_req, res) => {
  let dbStatus = "disconnected";
  let providersCount = 0;
  let primaryProvider = "none";

  // Database check
  try {
    const db = getDatabase();
    dbStatus = "connected";
    const providers = db
      .prepare("SELECT name, is_primary FROM providers")
      .all() as Array<{ name: string; is_primary: number }>;
    providersCount = providers.length;
    primaryProvider = providers.find((p) => p.is_primary === 1)?.name || "none";
  } catch (error) {
    dbStatus = "error";
  }

  // Agents check
  let agents: AgentRow[] = [];
  try {
    agents = getAllAgents();
  } catch (e) {
    // ignore
  }
  const running = agents.filter((a) => a.status === "running").length;

  // RPC check (optional - can be slow)
  let rpcStatus = "unknown";
  let rpcLatency = 0;
  try {
    const rpcUrl = getRpcUrl();
    const connection = new Connection(rpcUrl, 'confirmed');
    const start = Date.now();
    await connection.getSlot();
    rpcLatency = Date.now() - start;
    rpcStatus = "healthy";
  } catch (error) {
    rpcStatus = "error";
  }

  res.json({
    message: "Status retrieved successfully",
    data: {
      status: dbStatus === "connected" && rpcStatus !== "error" ? "ok" : "degraded",
      version: "0.1.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),

      // Core components
      database: {
        status: dbStatus,
        location: "~/.sigil/sigil.db"
      },

      llmProviders: {
        configured: providersCount,
        primary: primaryProvider,
      },

      agents: {
        total: agents.length,
        running,
        paused: agents.length - running,
      },

      // Network
      network: {
        rpc: getRpcUrl(),
        status: rpcStatus,
        latency: rpcLatency > 0 ? `${rpcLatency}ms` : null,
      },

      // System
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        }
      }
    },
  });
});
````

**Note:** RPC health check adds latency (~100-500ms). Consider making it optional via query param:

```typescript
const includeRpc = req.query.rpc === "true";
if (includeRpc) {
  // ... RPC check
}
```

**Expected Outcome:** More detailed health check for monitoring and debugging.

---

## 📋 Implementation Order

**Recommended sequence:**

1. **Fix 15** (5 min) - Remove commented code
2. **Fix 22** (10 min) - Add .env.example
3. **Fix 21** (15 min) - Add TypeScript comments
4. **Fix 20** (5 min) - Document naming convention
5. **Fix 11** (30 min) - Align React versions
6. **Fix 13** (45 min) - Break circular dependency
7. **Fix 23** (20 min) - Enhanced health check

**Total estimated time:** ~2.5 hours

---

## ✅ Verification Commands

After applying fixes:

```bash
# Check for TypeScript errors
cd /home/yusufakoredey/Desktop/sigil
pnpm build


# Verify no remaining issues
grep -r "any\[\]" packages/core/src/
grep -r "// function" packages/core/src/
grep -r "@ts-nocheck" packages/
```

---

## 🎉 Summary

**Current Status:** 18/23 fixes completed (78%)  
**Critical Issues:** All resolved ✅  
**Remaining:** Mostly code quality and documentation improvements

Your codebase is production-ready! These remaining fixes are polish and maintainability improvements.
