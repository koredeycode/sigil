# Fix 01: Remove TypeScript Type Checking Bypass

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 1-2 hours  
**Difficulty:** Medium

## 📋 Overview

**File:** `extension/popup.tsx`

**Issue:** The file has `// @ts-nocheck` at line 1, completely disabling TypeScript type checking. This defeats the purpose of using TypeScript and can hide serious bugs.

**Impact:** Type safety is completely disabled in the extension popup, making it prone to runtime errors.

## 🎯 Objective

Remove the `@ts-nocheck` comment and fix all resulting TypeScript errors properly by adding correct type annotations and interfaces.

## 📝 Step-by-Step Instructions

### Step 1: Remove the @ts-nocheck Comment

**File:** `extension/popup.tsx`

1. Open the file
2. Remove or comment out line 1:
```typescript
// @ts-nocheck  ← DELETE THIS LINE
```

### Step 2: Build to See All Type Errors

Run the build command to see all type errors:

```bash
cd /home/yusufakoredey/Desktop/sigil/extension
pnpm build
```

You'll see multiple TypeScript errors. Don't panic! We'll fix them systematically.

### Step 3: Define Proper Type Interfaces

Add these type definitions near the top of the file (after imports):

```typescript
// Type definitions
interface RequestData {
  type: 'connect' | 'signTransaction';
  origin: string;
  transactionMessage?: string;
  simulationData?: SimulationData;
}

interface SimulationData {
  status: 'approved' | 'rejected';
  analysis: string;
  riskLevel: 'LOW' | 'HIGH';
  error?: string;
}

interface Portfolio {
  sol: number;
  solLamports: number;
  tokens: TokenAccount[];
  pubkey: string;
}

interface TokenAccount {
  address: string;
  mint: string;
  balance: number;
  decimals: number;
  symbol: string;
}

interface Transaction {
  signature: string;
  blockTime: string | null;
  slot: number;
  status: string;
  err: any;
  memo: string | null;
}
```

### Step 4: Add Type Annotations to State Variables

Update the `useState` declarations with proper types:

```typescript
// Replace:
const [requestObj, setRequestObj] = useState<any>(null);
// With:
const [requestObj, setRequestObj] = useState<RequestData | null>(null);

// Replace:
const [portfolio, setPortfolio] = useState<any>(null);
// With:
const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

// Replace:
const [transactions, setTransactions] = useState<any[]>([]);
// With:
const [transactions, setTransactions] = useState<Transaction[]>([]);

// Replace:
const [simulationData, setSimulationData] = useState<any>(null);
// With:
const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
```

### Step 5: Fix authFetch Function Return Type

Update the `authFetch` function to be properly typed:

```typescript
async function authFetch(url: string, opts?: RequestInit): Promise<Response> {
  // ... existing implementation
}
```

### Step 6: Add Type Guards for Chrome Storage

When accessing chrome.storage.local results, add proper type checking:

```typescript
// Example in useEffect:
chrome.storage.local.get(['sigil_auth_token', 'sigil_theme'], (result: any) => {
  // Add type checking
  const token = typeof result.sigil_auth_token === 'string' ? result.sigil_auth_token : null;
  const theme = result.sigil_theme === 'dark' || result.sigil_theme === 'light' 
    ? result.sigil_theme 
    : 'dark';
  
  if (token) {
    setAuthToken(token);
  }
  setTheme(theme);
  setAuthChecked(true);
});
```

### Step 7: Fix Event Handler Types

Update event handlers with proper parameter types:

```typescript
// For input onChange handlers:
const handleTokenInput = (e: React.ChangeEvent<HTMLInputElement>) => {
  setTokenInput(e.target.value);
};

// For button onClick handlers:
const handleTokenSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
  e?.preventDefault();
  // ... rest of implementation
};
```

### Step 8: Add Type Assertions Where Necessary

For cases where TypeScript can't infer types but you know they're correct, use type assertions:

```typescript
// Example when parsing JSON responses:
const data = await res.json() as { message: string; data: Portfolio };
```

### Step 9: Fix Chrome API Calls

Add proper types for Chrome API callbacks:

```typescript
chrome.storage.local.set({ sigil_auth_token: token }, () => {
  if (chrome.runtime.lastError) {
    console.error('Storage error:', chrome.runtime.lastError);
    return;
  }
  setAuthToken(token);
  setTokenInput('');
});
```

### Step 10: Build Again and Fix Remaining Errors

```bash
pnpm build
```

If there are still errors:
1. Read each error message carefully
2. Add the appropriate type annotation or interface
3. Use `unknown` instead of `any` if type is truly dynamic
4. Use type assertions only when absolutely necessary

## ✅ Verification

### Test the Extension:

1. Build successfully:
```bash
cd extension
pnpm build
```

2. Load the extension in Chrome:
   - Go to `chrome://extensions`
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select `extension/build/chrome-mv3-prod`

3. Test functionality:
   - Open the extension popup
   - Verify token input works
   - Check wallet connection
   - Test theme toggle
   - Try transaction signing (if applicable)

4. Check browser console for runtime errors

### Expected Results:
- ✅ No TypeScript compilation errors
- ✅ Extension builds successfully  
- ✅ All functionality works as before
- ✅ No runtime errors in browser console
- ✅ Full IDE autocomplete and type checking restored

## 🐛 Troubleshooting

### Error: "Type 'X' is not assignable to type 'Y'"
**Solution:** Check the actual data structure being used and update your interface to match it.

### Error: "Cannot find name 'chrome'"
**Solution:** Make sure `@types/chrome` is installed in devDependencies.

### Error: "Object is possibly 'null'"
**Solution:** Add null checks before accessing properties:
```typescript
if (requestObj?.type === 'connect') { ... }
```

### Too Many Errors?
If you're overwhelmed with errors:
1. Fix one type of error at a time (e.g., all state variables first)
2. Comment out problematic sections temporarily
3. Fix them section by section
4. Don't give up! Each fix makes the code better.

## 📝 Commit Message

```bash
git add extension/popup.tsx
git commit -m "fix(extension): remove @ts-nocheck and add proper TypeScript types

- Remove @ts-nocheck directive from popup.tsx
- Add comprehensive type interfaces for RequestData, Portfolio, etc.
- Add type annotations to all state variables
- Fix event handler types
- Add proper Chrome API callback types
- Restore full TypeScript type checking

Closes #1"
```

## ⏭️ Next Step

After completing this fix, move to:
**`critical/02-implement-logger.md`**
