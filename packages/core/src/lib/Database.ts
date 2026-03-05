import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SIGIL_DIR = path.join(os.homedir(), '.sigil');
const DB_PATH = path.join(SIGIL_DIR, 'sigil.db');

let db: DatabaseSync | null = null;

/**
 * Ensures ~/.sigil/ directory exists and opens the SQLite database.
 * Creates all tables on first run.
 */
export function getDatabase(): DatabaseSync {
  if (db) return db;

  // Ensure ~/.sigil/ exists
  if (!fs.existsSync(SIGIL_DIR)) {
    fs.mkdirSync(SIGIL_DIR, { recursive: true });
  }

  db = new DatabaseSync(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  initializeTables(db);
  // migrateProviders(db);
  migrateChats(db);
  seedDefaults(db);

  return db;
}

/**
 * Create all tables if they don't already exist.
 */
function initializeTables(db: DatabaseSync): void {
  db.exec(`
    -- Agents: one row per agent
    CREATE TABLE IF NOT EXISTS agents (
      id          TEXT PRIMARY KEY,
      name        TEXT UNIQUE NOT NULL,
      pubkey      TEXT NOT NULL,
      status      TEXT DEFAULT 'paused' CHECK(status IN ('running', 'paused')),
      loop_interval INTEGER DEFAULT 60000,
      prompt      TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Logs: agent thought process + actions
    CREATE TABLE IF NOT EXISTS logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL,
      timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
      action      TEXT NOT NULL,
      result      TEXT,
      thought     TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    -- Config: global key-value settings
    CREATE TABLE IF NOT EXISTS config (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL
    );

    -- Providers: LLM provider configurations
    CREATE TABLE IF NOT EXISTS providers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      api_key     TEXT,
      model       TEXT NOT NULL,
      base_url    TEXT,
      compat      TEXT DEFAULT 'openai' CHECK(compat IN ('openai', 'anthropic')),
      is_primary  INTEGER DEFAULT 0,
      added_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Transactions: every on-chain action
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL,
      timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
      type        TEXT NOT NULL CHECK(type IN ('transfer', 'mint', 'burn', 'airdrop', 'swap', 'create_token', 'close_account', 'create_pool', 'stake', 'memo')),
      token       TEXT,
      amount      REAL,
      recipient   TEXT,
      signature   TEXT,
      status      TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
      fee         REAL,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    -- Chats: user and agent message history
    CREATE TABLE IF NOT EXISTS chats (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content     TEXT NOT NULL,
      tools       TEXT,
      timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    -- Cron Jobs: scheduled tasks for agents
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL,
      name        TEXT NOT NULL,
      expression  TEXT NOT NULL,
      task_prompt TEXT NOT NULL,
      is_active   INTEGER DEFAULT 1,
      last_run    DATETIME,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);
}


/**
 * Add tools column to chats table
 */
function migrateChats(db: DatabaseSync): void {
  try { db.exec('ALTER TABLE chats ADD COLUMN tools TEXT'); } catch {}
}

/**
 * Seed default config values if they don't already exist.
 */
function seedDefaults(db: DatabaseSync): void {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)'
  );

  const defaults: Record<string, string> = {
    kill_switch: 'false',
    per_trade_limit: '5',         // percentage of portfolio
    daily_volume_cap: '10',       // SOL
    slippage_cap: '1',            // percentage
    cooldown_period: '30',        // seconds
    confirmation_threshold: '50', // SOL value requiring confirmation
    rpc_url: 'https://api.devnet.solana.com',
    main_agent_id: '',
    main_agent_name: 'sigil',
  };

  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Execute a synchronized SQLite transaction.
 */
export function transaction<T>(fn: () => T): T {
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// ─── Query Helpers ─────────────────────────────────────────────────────────

// Agents
export function createAgent(id: string, name: string, pubkey: string, loopInterval = 60000, prompt: string | null = null) {
  const db = getDatabase();
  return db.prepare(
    'INSERT INTO agents (id, name, pubkey, loop_interval, prompt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, pubkey, loopInterval, prompt ?? null);
}

export function getAgent(nameOrId: string) {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM agents WHERE id = ? OR name = ?'
  ).get(nameOrId, nameOrId) as unknown as AgentRow | undefined;
}

export function getAllAgents() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM agents').all() as unknown as AgentRow[];
}

export function updateAgentStatus(id: string, status: 'running' | 'paused') {
  const db = getDatabase();
  return db.prepare('UPDATE agents SET status = ? WHERE id = ?').run(status, id);
}

export function updateAgentProfile(id: string, name: string, loopInterval: number) {
  const db = getDatabase();
  return db.prepare('UPDATE agents SET name = ?, loop_interval = ? WHERE id = ?').run(name, loopInterval, id);
}

export function updateAgentPrompt(id: string, prompt: string) {
  const db = getDatabase();
  return db.prepare('UPDATE agents SET prompt = ? WHERE id = ?').run(prompt, id);
}

export function deleteAgent(id: string) {
  return transaction(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM cron_jobs WHERE agent_id = ?').run(id);
    db.prepare('DELETE FROM logs WHERE agent_id = ?').run(id);
    db.prepare('DELETE FROM transactions WHERE agent_id = ?').run(id);
    db.prepare('DELETE FROM chats WHERE agent_id = ?').run(id);
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  });
}

// Logs
export function insertLog(agentId: string, action: string, result?: string, thought?: string) {
  const db = getDatabase();
  return db.prepare(
    'INSERT INTO logs (agent_id, action, result, thought) VALUES (?, ?, ?, ?)'
  ).run(agentId, action, result ?? null, thought ?? null);
}

export function getAgentLogs(agentId: string, limit = 50, before?: number) {
  const db = getDatabase();
  if (before) {
    return db.prepare(
      'SELECT * FROM logs WHERE agent_id = ? AND id < ? ORDER BY id DESC LIMIT ?'
    ).all(agentId, before, limit) as unknown as LogRow[];
  }
  return db.prepare(
    'SELECT * FROM logs WHERE agent_id = ? ORDER BY id DESC LIMIT ?'
  ).all(agentId, limit) as unknown as LogRow[];
}

// Chats
export function insertChat(agentId: string, role: 'user' | 'assistant' | 'system', content: string, tools?: string) {
  const db = getDatabase();
  return db.prepare(
    'INSERT INTO chats (agent_id, role, content, tools) VALUES (?, ?, ?, ?)'
  ).run(agentId, role, content, tools ?? null);
}

export function getAgentChats(agentId: string, limit = 100, before?: number) {
  const db = getDatabase();
  // We want the most recent messages, but returned in chronological order
  if (before) {
    const rows = db.prepare(
      `SELECT * FROM (
         SELECT * FROM chats WHERE agent_id = ? AND id < ? ORDER BY id DESC LIMIT ?
       ) ORDER BY id ASC`
    ).all(agentId, before, limit) as unknown as ChatRow[];
    return rows;
  }
  const rows = db.prepare(
    `SELECT * FROM (
       SELECT * FROM chats WHERE agent_id = ? ORDER BY id DESC LIMIT ?
     ) ORDER BY id ASC`
  ).all(agentId, limit) as unknown as ChatRow[];
  return rows;
}

// Config
export function getConfig(key: string): string | undefined {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as unknown as { value: string } | undefined;
  return row?.value;
}

export function setConfig(key: string, value: string) {
  const db = getDatabase();
  return db.prepare(
    'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
  ).run(key, value, value);
}

// Providers
export function addProvider(name: string, apiKey: string | null, model: string, isPrimary = false, baseUrl?: string | null, compat?: string | null) {
  const db = getDatabase();
  // If setting as primary, clear all other primaries first
  if (isPrimary) {
    db.prepare('UPDATE providers SET is_primary = 0').run();
  }
  return db.prepare(
    'INSERT INTO providers (name, api_key, model, is_primary, base_url, compat) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, apiKey ?? null, model, isPrimary ? 1 : 0, baseUrl ?? null, compat ?? 'openai');
}

export function getAllProviders() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM providers').all() as unknown as ProviderRow[];
}

export function getPrimaryProvider() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM providers WHERE is_primary = 1').get() as unknown as ProviderRow | undefined;
}

export function setPrimaryProvider(id: number) {
  return transaction(() => {
    const db = getDatabase();
    db.prepare('UPDATE providers SET is_primary = 0').run();
    db.prepare('UPDATE providers SET is_primary = 1 WHERE id = ?').run(id);
  });
}

export function removeProvider(id: number) {
  const db = getDatabase();
  return db.prepare('DELETE FROM providers WHERE id = ?').run(id);
}

// Logs
export function insertTransaction(
  agentId: string,
  type: string,
  token: string | null,
  amount: number | null,
  recipient: string | null,
  signature: string | null,
  status: 'pending' | 'confirmed' | 'failed' = 'pending',
  fee: number | null = null
) {
  const db = getDatabase();
  return db.prepare(
    `INSERT INTO transactions (agent_id, type, token, amount, recipient, signature, status, fee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(agentId, type, token ?? null, amount ?? null, recipient ?? null, signature ?? null, status, fee ?? null);
}

export function updateTransactionStatus(id: number, status: 'confirmed' | 'failed', signature?: string) {
  const db = getDatabase();
  if (signature) {
    return db.prepare('UPDATE transactions SET status = ?, signature = ? WHERE id = ?').run(status, signature, id);
  }
  return db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run(status, id);
}

export function getAgentTransactions(agentId: string, limit = 50) {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM transactions WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(agentId, limit) as unknown as TransactionRow[];
}

export function getDailyVolume(agentId: string): number {
  const db = getDatabase();
  const row = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE agent_id = ?
       AND status = 'confirmed'
       AND (token = 'SOL' OR token = 'So11111111111111111111111111111111111111112')
       AND timestamp > datetime('now', '-1 day')`
  ).get(agentId) as unknown as { total: number };
  return row.total;
}

// ─── Type Definitions ──────────────────────────────────────────────────────

export interface AgentRow {
  id: string;
  name: string;
  pubkey: string;
  status: 'running' | 'paused';
  loop_interval: number;
  prompt: string | null;
  created_at: string;
}

export interface LogRow {
  id: number;
  agent_id: string;
  timestamp: string;
  action: string;
  result: string | null;
  thought: string | null;
}

export interface ChatRow {
  id: number;
  agent_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools: string | null;
  timestamp: string;
}

export interface ProviderRow {
  id: number;
  name: string;
  api_key: string | null;
  model: string;
  base_url: string | null;
  compat: 'openai' | 'anthropic';
  is_primary: number;
  added_at: string;
}

export interface TransactionRow {
  id: number;
  agent_id: string;
  timestamp: string;
  type: string;
  token: string | null;
  amount: number | null;
  recipient: string | null;
  signature: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  fee: number | null;
}

export interface CronJobRow {
  id: number;
  agent_id: string;
  name: string;
  expression: string;
  task_prompt: string;
  is_active: number;
  last_run: string | null;
  created_at: string;
}

// ─── Cron Jobs ─────────────────────────────────────────────────────────────────

export function insertCronJob(
  agentId: string,
  name: string,
  expression: string,
  taskPrompt: string
) {
  const db = getDatabase();
  return db.prepare(
    'INSERT INTO cron_jobs (agent_id, name, expression, task_prompt) VALUES (?, ?, ?, ?)'
  ).run(agentId, name, expression, taskPrompt);
}

export function getCronJobsForAgent(agentId: string) {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM cron_jobs WHERE agent_id = ? ORDER BY created_at DESC'
  ).all(agentId) as unknown as CronJobRow[];
}

export function getAllActiveCronJobs() {
  const db = getDatabase();
  return db.prepare(
    'SELECT * FROM cron_jobs WHERE is_active = 1'
  ).all() as unknown as CronJobRow[];
}

export function toggleCronJob(id: number, active: boolean) {
  const db = getDatabase();
  return db.prepare('UPDATE cron_jobs SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id);
}

export function updateCronJobLastRun(id: number) {
  const db = getDatabase();
  return db.prepare('UPDATE cron_jobs SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}

export function deleteCronJob(id: number) {
  const db = getDatabase();
  return db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(id);
}

export function updateCronJob(id: number, name: string, expression: string, taskPrompt: string) {
  const db = getDatabase();
  return db.prepare(
    'UPDATE cron_jobs SET name = ?, expression = ?, task_prompt = ? WHERE id = ?'
  ).run(name, expression, taskPrompt, id);
}

export function getCronJob(id: number) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id) as unknown as CronJobRow | undefined;
}
