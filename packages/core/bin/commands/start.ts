import * as clack from "@clack/prompts";
import type { Command } from "commander";

export function registerStartCommand(program: Command) {
  program
    .command("start")
    .description("Boot the API server and start all active agent loops")
    .option("--fg", "Run in the foreground instead of daemonizing")
    .action(async (options) => {
      const { getRunningPid, removePid, spawnDaemon, writePid } =
        await import("../../src/lib/Daemon.js");

      const existingPid = getRunningPid();
      if (existingPid) {
        clack.log.warn(
          `Sigil Wallet is already running (PID: ${existingPid}).`,
        );
        clack.log.info(
          `Run \`sigil stop\` first, or \`sigil dashboard\` to open the UI.`,
        );
        process.exit(0);
      }

      if (options.fg) {
        // Run in foreground
        clack.log.info("Sigil Wallet — Starting in foreground...");

        // Write PID FIRST before any slow imports
        // This allows the parent process to detect startup immediately
        writePid(process.pid);

        const { agentManager } =
          await import("../../src/agent/AgentManager.js");
        const { cronScheduler } =
          await import("../../src/agent/CronScheduler.js");

        // Clean up on exit
        const cleanup = () => {
          cronScheduler.shutdown();
          agentManager.shutdown();
          removePid();
          process.exit(0);
        };
        process.on("SIGINT", cleanup);
        process.on("SIGTERM", cleanup);

        const { createSessionToken } = await import("../../src/lib/Auth.js");
        const { getAuthToken } = await import("../../src/lib/Config.js");
        const { getDatabase } = await import("../../src/lib/Database.js");
        const { startServer } = await import("../../src/server/app.js");

        getDatabase();
        let token = getAuthToken();
        if (!token) {
          token = createSessionToken();
        }

        const s = clack.spinner();
        s.start("Starting API Server...");
        // Start the API server
        await startServer();
        s.stop("API Server started on port 7445");

        // Ensure main agent exists, auto-create on first boot
        let mainAgent = agentManager.getMainAgent();
        if (!mainAgent) {
          s.start("No agent found — initializing main agent...");
          mainAgent = await agentManager.initMainAgent();
          s.stop(`Main agent created. Wallet: ${mainAgent.pubkey}`);
          await agentManager.start(mainAgent.id);
        }

        s.start("Booting agents and resuming jobs...");
        // Auto-resume all agents that were previously running
        await agentManager.startAll();

        // Load and start cron jobs
        cronScheduler.loadAll();
        cronScheduler.loadAutonomousCycles();

        const agents = agentManager.list();
        const cronInfo = cronScheduler.listActive();

        s.stop("All systems operational.");

        // Register auto-start on boot (cross-platform, best-effort)
        const { enableAutoStart } = await import("../../src/lib/Startup.js");
        enableAutoStart();

        clack.log.step(`Session Token: ${token}`);
        clack.log.step(`Agents: ${agents.length} loaded`);
        clack.log.step(
          `Cron Jobs: ${cronInfo.cronJobs} active, ${cronInfo.autonomousCycles} autonomous cycles`,
        );
      } else {
        // Spawn background daemon
        clack.log.info("Sigil Wallet — Starting background process...");

        const s = clack.spinner();
        s.start("Spawning daemon (this may take up to 15 seconds)...");

        try {
          const pid = await spawnDaemon();
          s.stop(`✓ Daemon started successfully (PID ${pid})`);

          // Register auto-start on boot (cross-platform, best-effort)
          const { enableAutoStart } = await import("../../src/lib/Startup.js");
          enableAutoStart();

          const { getLogFile } = await import("../../src/lib/Daemon.js");

          clack.log.success("Sigil Wallet is now running in the background!");
          clack.log.step(`API Server: http://localhost:7445`);
          clack.log.step(`Log file: ${getLogFile()}`);
          clack.log.info("");
          clack.log.info("Next steps:");
          clack.log.step(`• Run \`sigil dashboard\` to open the web UI`);
          clack.log.step(`• Run \`sigil status\` to check daemon health`);
          clack.log.step(`• Run \`sigil stop\` to stop the daemon`);
        } catch (error) {
          s.stop("✗ Failed to start daemon");
          clack.log.error(
            `Error: ${error instanceof Error ? error.message : String(error)}`,
          );

          const { getLogFile } = await import("../../src/lib/Daemon.js");
          clack.log.info(`Check ${getLogFile()} for details.`);
          clack.log.info("");
          clack.log.warn(
            "💡 Tip: If the daemon is still starting, wait a few seconds and run `sigil status`",
          );
          process.exit(1);
        }

        process.exit(0);
      }
    });
}
