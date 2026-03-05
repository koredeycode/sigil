import * as clack from "@clack/prompts";
import type { Command } from "commander";

export function registerLogsCommand(program: Command) {
  program
    .command("logs [agent]")
    .option("-n, --tail <count>", "Number of log entries", "20")
    .description(
      "View agent activity logs from database (use daemon-logs for system logs)",
    )
    .action(async (agent?: string, opts?: { tail: string }) => {
      const { agentManager } = await import("../../src/agent/AgentManager.js");
      const { getAgentLogs, getDatabase } =
        await import("../../src/lib/Database.js");

      getDatabase();

      if (!agent) {
        const agents = agentManager.list();
        if (agents.length === 0) {
          clack.log.warning("No agents found. Run `sigil agent create` first.");
          process.exit(0);
        }

        const selected = await clack.select({
          message: "View logs for which agent?",
          options: agents.map((a) => ({
            value: a.name,
            label: a.name,
            hint: `${a.status}`,
          })),
        });
        if (clack.isCancel(selected)) {
          clack.cancel("Cancelled.");
          process.exit(0);
        }
        agent = String(selected);
      }

      const a = agentManager.get(agent);
      if (!a) {
        clack.log.error(`Agent "${agent}" not found.`);
        return;
      }

      const s = clack.spinner();
      s.start(`Fetching logs for agent ${agent}...`);
      const logs = getAgentLogs(a.id, Number(opts?.tail ?? "20"));
      s.stop(`Fetched ${logs.length} logs for ${agent}`);

      if (logs.length === 0) {
        clack.log.info("No logs yet.");
        return;
      }
      for (const log of logs.reverse()) {
        clack.log.message(
          `[${log.timestamp}] ${log.action}: ${log.result ?? ""}`,
        );
      }

      clack.log.info("");
      clack.log.info(
        "Tip: Use `sigil daemon-logs` to view system logs (stdout/stderr)",
      );
    });
}
