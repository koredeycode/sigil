// Sigil Core — Public API Entry Point

// ─── AGENT & DIRECTIVE ENGINE ──────────────────────────────────────────────
/** 
 * Agent execution loops, LangGraph state management, and cron job scheduling. 
 */
export { invalidateAgentGraph, invokeSolanaAgent, runAutonomousCycle } from './agent/AgentLoop.js';
export { agentManager } from './agent/AgentManager.js';
export { cronScheduler } from './agent/CronScheduler.js';
export { buildSystemPrompt, createModel, getPrimaryModel } from './agent/LLMChain.js';
export { clearAgentKit, createTools } from './agent/ToolRegistry.js';

// ─── AUTH & CONFIG ─────────────────────────────────────────────────────────
/** 
 * Session tokens, API key encryption, and global configuration accessors. 
 */
export { createSessionToken, decryptApiKey, encryptApiKey, rotateToken, validateToken } from './lib/Auth.js';
export * from './lib/Config.js';

// ─── INFRASTRUCTURE (DB & LOGGING) ─────────────────────────────────────────
/** 
 * SQLite database connections, entity types, and centralized structured logging. 
 */
export { closeDatabase, getDatabase } from './lib/Database.js';
export type { AgentRow, ChatRow, CronJobRow, LogRow, ProviderRow, TransactionRow } from './lib/Database.js';
export { validateIntent } from './lib/Guardrails.js';
export { logger } from './lib/Logger.js';

// ─── SERVER ────────────────────────────────────────────────────────────────
/** 
 * Express/Socket.IO server orchestration and API schemas. 
 */
export { startServer } from './server/app.js';
export type { ApiResponse } from './server/types.js';

// ─── WALLET & ON-CHAIN EXECUTION ───────────────────────────────────────────
/** 
 * Secure key storage, Solana RPC abstractions, and transaction signing logic. 
 */
export { requestAirdrop, signAndSubmit } from './wallet/Signer.js';
export { getConnection } from './wallet/TransactionBuilder.js';
export { createWallet, deleteWallet, getKeypair, wipeFromMemory } from './wallet/Wallet.js';

