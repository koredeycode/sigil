import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SIGIL_DIR = path.join(os.homedir(), '.sigil');
const PID_FILE = path.join(SIGIL_DIR, 'run.pid');

/**
 * Ensures the ~/.sigil directory exists.
 */
export function ensureSigilDir() {
  if (!fs.existsSync(SIGIL_DIR)) {
    fs.mkdirSync(SIGIL_DIR, { recursive: true });
  }
}

/**
 * Checks if the Sigil daemon is currently running.
 * Returns the PID if running, null otherwise.
 */
export function getRunningPid(): number | null {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
    try {
      process.kill(pid, 0);
      return pid;
    } catch (e) {
      // Stale pid file
      fs.unlinkSync(PID_FILE);
    }
  }
  return null;
}

/**
 * Spawns the Sigil daemon in the background.
 * Returns the child process PID.
 */
export async function spawnDaemon(): Promise<number> {
  ensureSigilDir();
  
  const existingPid = getRunningPid();
  if (existingPid) {
    return existingPid;
  }

  // We use the same file we were executed with (e.g. dist/bin/cli.js)
  // and append the `start --fg` args
  const child = spawn(process.argv[0], [process.argv[1], 'start', '--fg'], {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();

  if (child.pid === undefined) {
    throw new Error('Failed to get PID for spawned detached process.');
  }

  return child.pid;
}

/**
 * Writes the current PID to the pid file.
 */
export function writePid(pid: number) {
  ensureSigilDir();
  fs.writeFileSync(PID_FILE, String(pid));
}

/**
 * Removes the pid file.
 */
export function removePid() {
  if (fs.existsSync(PID_FILE)) {
    fs.unlinkSync(PID_FILE);
  }
}
