import { z } from 'zod';

// agents.ts
export const createAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(50, 'Agent name is too long').regex(/^[a-zA-Z0-9_-]+$/, 'Invalid agent name. Use only alphanumeric characters, dashes, or underscores.'),
  loopInterval: z.number().int().min(1000).max(86400000).optional(),
  prompt: z.string().max(2000, 'Prompt is too long').optional(),
  privateKey: z.string().optional() // Found in the route
});

export const updateAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(50, 'Agent name is too long').regex(/^[a-zA-Z0-9_-]+$/, 'Invalid agent name. Use only alphanumeric characters, dashes, or underscores.'),
  loopInterval: z.number().int().min(1000).max(86400000), // Required in route
});

export const agentActionSchema = z.object({
  action: z.enum(['start', 'pause', 'kill']),
});

// chat.ts
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'message is required'),
  agentId: z.string().min(1, 'agentId is required'), // It's just a string in the DB, uuid might be too strict
});

// config.ts
export const updateConfigSchema = z.object({
  kill_switch: z.union([z.boolean(), z.string()]).optional(),
  per_trade_limit: z.number().min(0).max(100).optional(),
  daily_volume_cap: z.number().nonnegative().optional(),
  slippage_cap: z.number().min(0).max(100).optional(),
  cooldown_period: z.number().int().nonnegative().optional(),
  confirmation_threshold: z.number().nonnegative().optional(),
  rpc_url: z.string().url().optional(),
  main_agent_id: z.string().optional(),
  main_agent_name: z.string().optional(),
  allowlist: z.string().optional(),
});

// cron.ts
export const createCronJobSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  name: z.string().min(1, 'name is required').max(50),
  expression: z.string().min(1, 'expression is required'), // node-cron validates this separately
  taskPrompt: z.string().min(1, 'taskPrompt is required').max(2000),
});

export const toggleCronJobSchema = z.object({
  active: z.boolean({ required_error: 'active (boolean) is required' }),
});

export const updateCronJobSchema = z.object({
  name: z.string().min(1, 'name is required').max(50),
  expression: z.string().min(1, 'expression is required'),
  taskPrompt: z.string().min(1, 'taskPrompt is required').max(2000),
});

// extension.ts
export const simulateTransactionSchema = z.object({
  transactionMessage: z.string().min(1, 'Transaction message required'),
  origin: z.string().optional().default('unknown'),
});

export const signTransactionSchema = z.object({
  transactionMessage: z.string().min(1, 'Transaction message required'),
});

// providers.ts
export const addProviderSchema = z.object({
  provider: z.string().min(1, 'Provider name is required').optional(),
  name: z.string().min(1).optional(),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().min(1, 'Model is required'),
  isPrimary: z.boolean().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')).or(z.undefined()),
  compat: z.enum(['openai', 'anthropic']).optional(),
}).refine(data => data.provider || data.name, {
  message: "Either provider or name is required",
  path: ["provider"]
});

export const updateProviderSchema = z.object({
  apiKey: z.string().min(1, 'API key cannot be empty'),
});

// wallet.ts
export const requestAirdropSchema = z.object({});
