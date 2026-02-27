#!/usr/bin/env node

/**
 * sigil-reset — Wipes and reinitializes the Sigil database.
 * 
 * Usage:
 *   npx tsx scripts/reset-db.ts
 *   # or after build:
 *   node dist/scripts/reset-db.js
 * 
 * This will:
 * 1. Delete the existing ~/.sigil/sigil.db file
 * 2. Reinitialize a fresh database with all tables
 * 3. Seed default config values
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SIGIL_DIR = path.join(os.homedir(), '.sigil');
const DB_PATH = path.join(SIGIL_DIR, 'sigil.db');
const DB_WAL = path.join(SIGIL_DIR, 'sigil.db-wal');
const DB_SHM = path.join(SIGIL_DIR, 'sigil.db-shm');
const PID_FILE = path.join(SIGIL_DIR, 'run.pid');

console.log('\n  ⎔ Sigil — Database Reset\n');

// Step 1: Kill any running daemon
if (fs.existsSync(PID_FILE)) {
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
  try {
    process.kill(pid);
    console.log(`  ✔ Stopped running daemon (PID: ${pid})`);
  } catch (err: any) {
    if (err.code === 'ESRCH') {
      console.log(`  ⓘ Daemon PID ${pid} not running, cleaning up stale pidfile.`);
    }
  }
  fs.unlinkSync(PID_FILE);
}

// Step 2: Remove existing database files
const filesToRemove = [DB_PATH, DB_WAL, DB_SHM];
let removed = 0;

for (const file of filesToRemove) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    removed++;
    console.log(`  ✔ Removed ${path.basename(file)}`);
  }
}

if (removed === 0) {
  console.log('  ⓘ No existing database found — creating fresh.');
} else {
  console.log(`  ✔ Removed ${removed} database file(s).`);
}

// Step 2: Reinitialize the database
// Import after deletion so getDatabase() creates a fresh one
const { getDatabase, closeDatabase } = await import('../src/lib/Database.js');

const db = getDatabase();
console.log('  ✔ Database reinitialized with all tables.');

// Verify tables
const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
).all() as unknown as Array<{ name: string }>;

console.log(`  ✔ Tables created: ${tables.map(t => t.name).join(', ')}`);

// Step 3: Close
closeDatabase();

console.log('\n  ⎔ Done! Database is fresh and ready.');
console.log('  Run `sigil start --fg` to boot the server.\n');
