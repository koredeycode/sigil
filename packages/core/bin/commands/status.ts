import * as clack from "@clack/prompts";
import type { Command } from "commander";
import fs from "node:fs";

export function registerStatusCommand(program: Command) {
  program
    .command("status")
    .description("Check if the Sigil Wallet background daemon is running")
    .action(async () => {
      const { getRunningPid, getLogFile, removePid } =
        await import(new URL('../../src/lib/Daemon.js', import.meta.url).href);

      const pid = getRunningPid();

      if (!pid) {
        clack.log.warn("Sigil Wallet is NOT running.");
        clack.log.info("Start it with: sigil start");
        return;
      }

      // Check if process is actually running
      try {
        process.kill(pid, 0);
        clack.log.success(`✓ Sigil Wallet is running (PID: ${pid})`);
        clack.log.step(`API Server: http://localhost:7445`);
        clack.log.step(`Log file: ${getLogFile()}`);

        // Show last few lines of log if available
        const logFile = getLogFile();
        if (fs.existsSync(logFile)) {
          const stats = fs.statSync(logFile);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          clack.log.step(`Log size: ${sizeMB} MB`);
        }
      } catch (e: any) {
        if (e.code === "ESRCH") {
          clack.log.warn(`✗ Sigil Wallet is NOT running (stale PID ${pid}).`);
          clack.log.info("Cleaning up stale pidfile...");
          removePid();
        } else {
          clack.log.error(`Status check failed: ${e.message}`);
        }
      }
    });
}
