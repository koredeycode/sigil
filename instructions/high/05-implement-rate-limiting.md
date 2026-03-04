# Fix 05: Implement Rate Limiting

**Priority:** 🟠 HIGH  
**Estimated Time:** 1 hour  
**Difficulty:** Easy-Medium

## 📋 Overview

**Files:** `packages/core/src/server/app.ts`, route files

**Issue:** No rate limiting on API endpoints. Vulnerable to abuse, DoS attacks, and LLM quota exhaustion.

**Impact:** Server can be overwhelmed, costly LLM API abuse, poor service availability.

## 🎯 Objective

Add rate limiting to protect API endpoints from abuse.

## 📝 Step-by-Step Instructions

### Step 1: Install express-rate-limit

```bash
cd packages/core
pnpm add express-rate-limit
pnpm add -D @types/express-rate-limit
```

### Step 2: Create Rate Limit Configurations

**Create file:** `packages/core/src/server/middleware/rateLimit.ts`

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { 
    message: 'Too many requests from this IP, please try again later.',
    data: null 
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip successful requests that are not logged
  skip: (req) => req.path === '/api/status',
});

// Stricter limit for LLM-based endpoints - 10 requests per minute
export const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { 
    message: 'Too many chat requests. Please slow down.',
    data: null 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limit for auth endpoints - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { 
    message: 'Too many authentication attempts. Please try again later.',
    data: null 
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### Step 3: Apply Rate Limiters in Server

**File:** `packages/core/src/server/app.ts`

Add import at the top:

```typescript
import { apiLimiter, authLimiter, llmLimiter } from './middleware/rateLimit.js';
```

Apply limiters after CORS and JSON middleware (around line 44):

```typescript
// Middleware
app.use(cors());
app.use(express.json());

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);
```

Apply specific limiters before route registration (around line 60):

```typescript
// Apply stricter rate limits to specific routes
app.use('/api/chat', llmLimiter);
app.use('/api/extension/simulate', llmLimiter);
app.use('/api/extension/token', authLimiter);
```

### Step 4: Test Rate Limiting

Build and start the server:

```bash
cd packages/core
pnpm build
pnpm start
```

Test with rapid requests:

```bash
# Test general API limit:
for i in {1..101}; do curl http://localhost:7445/api/status; done

# Test LLM endpoint limit (will need auth token):
for i in {1..11}; do 
  curl -X POST http://localhost:7445/api/chat \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}'; 
done
```

After exceeding limit, you should get:
- Status: `429 Too Many Requests`
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

## ✅ Verification

- ✅ Build succeeds
- ✅ Server starts properly
- ✅ Rate limits enforced (429 status after limit)
- ✅ Rate limit headers present in response
- ✅ Normal requests still work

## 📝 Commit Message

```bash
git commit -m "feat(server): add rate limiting to protect API endpoints

- Install express-rate-limit
- Create rate limit configurations for general, LLM, and auth endpoints
- Apply rate limiters in server middleware
- Add rate limit headers to responses

Closes #5"
```

## ⏭️ Next Step: `high/06-database-transactions.md`
