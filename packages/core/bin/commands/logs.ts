import * as clack from "@clack/prompts";
import type { Command } from "commander";
import { spawn } from "node:child_process";
import fs from "node:fs";

export function registerLogsCommand(program: Command) {
  program
    .command("logs")
    .option("-f, --follow", "Follow log output (like tail -f)")
    .option("-n, --lines <count>", "Number of lines to show", "50")
    .description("View daemon process logs (stdout/stderr)")
    .action(async (opts: { follow?: boolean; lines: string }) => {
      const { getLogFile, getRunningPid } =
        await import("../../src/lib/Daemon.js");

      const logFile = getLogFile();

      if (!fs.existsSync(logFile)) {
        clack.log.warn("No daemon log file found.");
        clack.log.info(`Expected location: ${logFile}`);
        clack.log.info("Start the daemon with: sigil start");
        return;
      }

      const pid = getRunningPid();
      if (pid) {
        clack.log.info(`Daemon is running (PID: ${pid})`);
      } else {
        clack.log.warn("Daemon is not currently running.");
      }

      clack.log.info(`Log file: ${logFile}\n`);

      if (opts.follow) {
        // Stream logs in real-time
        clack.log.info("Following logs... (Press Ctrl+C to stop)\n");
        const tail = spawn("tail", ["-f", "-n", opts.lines, logFile], {
          stdio: "inherit",
        });

        process.on("SIGINT", () => {
          tail.kill();
          process.exit(0);
        });
      } else {
        // Show last N lines
        const tail = spawn("tail", ["-n", opts.lines, logFile], {
          stdio: "inherit",
        });

        tail.on("close", () => {
          clack.log.info(
            `\n\nShowing last ${opts.lines} lines. Use --follow to stream logs.`,
          );
        });
      }
    });
}
