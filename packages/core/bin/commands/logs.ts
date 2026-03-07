import * as clack from "@clack/prompts";
import type { Command } from "commander";
import fs from "node:fs";

export function registerLogsCommand(program: Command) {
  program
    .command("logs")
    .option("-f, --follow", "Follow log output (like tail -f)")
    .option("-n, --lines <count>", "Number of lines to show", "50")
    .description("View daemon process logs (stdout/stderr)")
    .action(async (opts: { follow?: boolean; lines: string }) => {
      const { getLogFile, getRunningPid } = await import(
        new URL("../../src/lib/Daemon.js", import.meta.url).href
      );

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

      const { Tail, tailFile } = await import(
        new URL("../../src/lib/LogUtils.js", import.meta.url).href
      );

      if (opts.follow) {
        // Stream logs in real-time
        clack.log.info("Following logs... (Press Ctrl+C to stop)\n");
        const tail = tailFile(
          logFile,
          { lines: parseInt(opts.lines, 10), follow: true },
          (data: string) => {
            process.stdout.write(data);
          },
        );

        process.on("SIGINT", () => {
          if (tail) tail.kill();
          process.exit(0);
        });
      } else {
        // Show last N lines
        tailFile(
          logFile,
          { lines: parseInt(opts.lines, 10), follow: false },
          (data: string) => {
            process.stdout.write(data);
          },
        );

        clack.log.info(
          `\n\nShowing last ${opts.lines} lines. Use --follow to stream logs.`,
        );
      }
    });
}
