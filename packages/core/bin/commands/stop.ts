import * as clack from "@clack/prompts";
import type { Command } from "commander";

export function registerStopCommand(program: Command) {
  program
    .command("stop")
    .description("Stop the background Sigil Wallet daemon")
    .action(async () => {
      const { getRunningPid, removePid } =
        await import(new URL('../../src/lib/Daemon.js', import.meta.url).href);

      const pid = getRunningPid();
      if (!pid) {
        clack.log.warn("No background daemon is currently running.");
        return;
      }

      try {
        const s = clack.spinner();
        s.start(`Stopping daemon (PID ${pid})...`);

        // Send SIGTERM to gracefully shutdown
        process.kill(pid, "SIGTERM");

        // Wait for process to actually stop (with timeout)
        let stopped = false;
        for (let i = 0; i < 50; i++) {
          try {
            process.kill(pid, 0);
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch {
            stopped = true;
            break;
          }
        }

        if (!stopped) {
          // Force kill if graceful shutdown failed
          s.message("Graceful shutdown timed out, forcing...");
          try {
            process.kill(pid, "SIGKILL");
          } catch {
            // Already dead
          }
        }

        s.stop(`Sigil Wallet daemon (PID ${pid}) stopped.`);
      } catch (err: any) {
        if (err.code === "ESRCH") {
          clack.log.info(
            `Process ${pid} is not running. Cleaning up stale pidfile.`,
          );
        } else {
          clack.log.error(`Failed to stop process ${pid}: ${err.message}`);
        }
      }

      // Always remove the PID file
      removePid();

      // Remove auto-start on boot (cross-platform, best-effort)
      try {
        const { disableAutoStart } = await import(new URL('../../src/lib/Startup.js', import.meta.url).href);
        disableAutoStart();
      } catch {
        // Ignore errors from startup script
      }
    });
}
