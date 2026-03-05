import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SIGIL_DIR = path.join(os.homedir(), ".sigil");
const PID_FILE = path.join(SIGIL_DIR, "run.pid");
const LOG_FILE = path.join(SIGIL_DIR, "daemon.log");

/**
 * Ensures the ~/.sigil directory exists.
 */
export function ensureSigilDir() {
  if (!fs.existsSync(SIGIL_DIR)) {
    fs.mkdirSync(SIGIL_DIR, { recursive: true });
  }
}

/**
 * Get the path to the daemon log file.
 */
export function getLogFile(): string {
  return LOG_FILE;
}

/**
 * Checks if the Sigil daemon is currently running.
 * Returns the PID if running, null otherwise.
 */
export function getRunningPid(): number | null {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf8"), 10);
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
 * Returns the actual daemon PID after verification.
 */
export async function spawnDaemon(): Promise<number> {
  ensureSigilDir();

  const existingPid = getRunningPid();
  if (existingPid) {
    return existingPid;
  }

  // Open log file for daemon output
  const logFd = fs.openSync(LOG_FILE, "a");

  // We use the same file we were executed with (e.g. dist/bin/cli.js)
  // and append the `start --fg` args
  const child = spawn(process.argv[0], [process.argv[1], "start", "--fg"], {
    detached: true,
    stdio: ["ignore", logFd, logFd], // Redirect stdout and stderr to log file
  });

  child.unref();

  // Wait for the daemon to write its PID (with extended timeout for slower systems)
  // The daemon needs time to: spawn process -> load Node modules -> init DB -> write PID
  const maxWaitMs = 15000; // 15 seconds
  const startTime = Date.now();
  let lastCheckTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const pid = getRunningPid();
    if (pid) {
      // Verify the process is actually running
      try {
        process.kill(pid, 0);
        return pid;
      } catch {
        // PID exists in file but process is not running
        continue;
      }
    }

    // Log progress every 2 seconds to show we're still waiting
    const elapsed = Date.now() - lastCheckTime;
    if (elapsed >= 2000) {
      lastCheckTime = Date.now();
      // Process is still starting up...
    }
  }

  // If we get here, daemon might still be starting (check one more time)
  const finalPid = getRunningPid();
  if (finalPid) {
    try {
      process.kill(finalPid, 0);
      return finalPid;
    } catch {
      // Fall through to error
    }
  }

  throw new Error(
    `Daemon startup verification timed out after ${maxWaitMs}ms. ` +
      `The daemon may still be starting. Check ${LOG_FILE} for details, or run 'sigil status' in a few seconds.`,
  );
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
