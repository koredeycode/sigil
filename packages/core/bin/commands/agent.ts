import * as clack from "@clack/prompts";
import type { Command } from "commander";

export function registerAgentCommand(program: Command) {
  const agent = program
    .command("agent")
    .description("Manage the Sigil Wallet agent");

  // sigil agent init — initialize (or show) the main agent
  agent
    .command("init")
    .option(
      "-k, --key <privateKey>",
      "Import an existing wallet via base58 private key",
    )
    .description('Initialize the main "sigil" agent (NOT for sub-agents)')
    .action(async (opts?: { key?: string }) => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();

      const existing = agentManager.getMainAgent();
      if (existing) {
        clack.log.info(`Main agent already initialized.`);
        clack.log.step(`Name:   ${existing.name}`);
        clack.log.step(`Wallet: ${existing.pubkey}`);
        clack.log.step(`Status: ${existing.status}`);
        return;
      }

      let privateKey: string | undefined = opts?.key;

      if (!privateKey) {
        const wantImport = await clack.confirm({
          message: "Import an existing Solana wallet? (Default: generate new)",
          initialValue: false,
        });
        if (clack.isCancel(wantImport)) {
          clack.cancel("Cancelled.");
          process.exit(0);
        }

        if (wantImport) {
          const inputKey = await clack.password({
            message: "Enter base58 Private Key (hidden):",
            validate: (val) =>
              val.length < 32 ? "Key seems too short" : undefined,
          });
          if (clack.isCancel(inputKey)) {
            clack.cancel("Cancelled.");
            process.exit(0);
          }
          privateKey = String(inputKey);
        }
      }

      const s = clack.spinner();
      s.start("Initializing agent and persisting wallet...");
      const a = await agentManager.initMainAgent(privateKey);
      s.stop(`Main agent initialized. Wallet: ${a.pubkey}`);
    });

  // sigil agent info — show agent details
  agent
    .command("info")
    .description("Show the main agent details")
    .action(async () => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) {
        clack.log.warn("Agent not initialized. Run `sigil agent init` first.");
        return;
      }
      clack.log.info(`Sigil Agent: ${a.name}`);
      clack.log.step(`ID:       ${a.id}`);
      clack.log.step(`Wallet:   ${a.pubkey}`);
      clack.log.step(`Status:   ${a.status}`);
      clack.log.step(`Interval: ${a.loop_interval / 1000}s`);
      clack.log.step(`Created:  ${a.created_at}`);
    });

  // sigil agent start — resume the agent
  agent
    .command("start")
    .description("Start the main agent")
    .action(async () => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) {
        clack.log.warn("Agent not initialized. Run `sigil agent init` first.");
        return;
      }
      await agentManager.start();
      clack.log.success(`Agent "${a.name}" started.`);
    });

  // sigil agent pause — pause the agent
  agent
    .command("pause")
    .description("Pause the main agent")
    .action(async () => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) {
        clack.log.warn("Agent not initialized.");
        return;
      }
      agentManager.pause();
      clack.log.success(`Agent "${a.name}" paused.`);
    });

  // sigil agent reset — destroy and reinitialize
  agent
    .command("reset")
    .description("Destroy the main agent and optionally reinitialize")
    .action(async () => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const a = agentManager.getMainAgent();
      if (!a) {
        clack.log.warn(
          "No agent to reset. Run `sigil agent init` to create one.",
        );
        return;
      }

      const confirmed = await clack.confirm({
        message: `This will destroy agent "${a.name}" and all its data. Continue?`,
      });
      if (clack.isCancel(confirmed) || !confirmed) {
        clack.cancel("Cancelled.");
        return;
      }

      const s = clack.spinner();
      s.start("Destroying agent...");
      await agentManager.destroy(a.id);
      s.stop("Agent destroyed.");

      const reinit = await clack.confirm({
        message: "Reinitialize a fresh agent now?",
        initialValue: true,
      });
      if (clack.isCancel(reinit) || !reinit) return;

      s.start("Initializing fresh agent...");
      const newAgent = await agentManager.initMainAgent();
      s.stop(`Fresh agent initialized. Wallet: ${newAgent.pubkey}`);
    });

  // ─── Sub-Agent Management Commands ────────────────────────────────────

  // sigil agent create — create a new sub-agent
  agent
    .command("create <name>")
    .description("Create a new sub-agent with its own wallet")
    .option("-i, --interval <seconds>", "Loop interval in seconds", "60")
    .option("-p, --prompt <prompt>", "System prompt/personality for the agent")
    .option(
      "-k, --key <privateKey>",
      "Import an existing wallet via base58 private key",
    )
    .action(
      async (
        name: string,
        opts: { interval?: string; prompt?: string; key?: string },
      ) => {
        const { agentManager } =
          await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
        const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

        getDatabase();

        // Validate name
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          clack.log.error(
            "Invalid agent name. Use only alphanumeric characters, dashes, or underscores.",
          );
          return;
        }

        if (name === "sigil") {
          clack.log.error(
            'Cannot create agent with reserved name "sigil". Use `sigil agent init` for the main agent.',
          );
          return;
        }

        const existing = agentManager.get(name);
        if (existing) {
          clack.log.error(`Agent "${name}" already exists.`);
          return;
        }

        const loopInterval = parseInt(opts.interval || "60", 10) * 1000;

        const s = clack.spinner();
        s.start(`Creating agent "${name}"...`);
        try {
          const agent = await agentManager.create(
            name,
            loopInterval,
            opts.key,
            opts.prompt,
          );
          s.stop(`Agent "${name}" created successfully.`);
          clack.log.step(`Name:   ${agent.name}`);
          clack.log.step(`Wallet: ${agent.pubkey}`);
          clack.log.step(`Status: ${agent.status}`);
          clack.log.step(`ID:     ${agent.id}`);
        } catch (error) {
          s.stop("Failed to create agent.");
          clack.log.error(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    );

  // sigil agent list — list all agents
  agent
    .command("list")
    .description("List all agents (main and sub-agents)")
    .action(async () => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const agents = agentManager.list();

      if (agents.length === 0) {
        clack.log.warn(
          "No agents found. Run `sigil agent init` to create the main agent.",
        );
        return;
      }

      clack.log.info(`Found ${agents.length} agent(s):\n`);
      for (const agent of agents) {
        const isMain = agent.name === "sigil";
        const badge = isMain ? " [MAIN]" : "";
        clack.log.step(`${agent.name}${badge}`);
        console.log(`  ID:       ${agent.id}`);
        console.log(`  Wallet:   ${agent.pubkey}`);
        console.log(`  Status:   ${agent.status}`);
        console.log(`  Interval: ${agent.loop_interval / 1000}s`);
        console.log(`  Created:  ${agent.created_at}\n`);
      }
    });

  // sigil agent get — get detailed info for any agent
  agent
    .command("get <nameOrId>")
    .description("Show detailed information for a specific agent")
    .action(async (nameOrId: string) => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const a = agentManager.get(nameOrId);
      if (!a) {
        clack.log.error(`Agent "${nameOrId}" not found.`);
        return;
      }

      const isMain = a.name === "sigil";
      clack.log.info(`Agent: ${a.name}${isMain ? " [MAIN]" : ""}`);
      clack.log.step(`ID:       ${a.id}`);
      clack.log.step(`Wallet:   ${a.pubkey}`);
      clack.log.step(`Status:   ${a.status}`);
      clack.log.step(`Interval: ${a.loop_interval / 1000}s`);
      clack.log.step(`Created:  ${a.created_at}`);
      if (a.prompt) {
        clack.log.step(
          `Prompt:   ${a.prompt.substring(0, 100)}${a.prompt.length > 100 ? "..." : ""}`,
        );
      }
    });

  // sigil agent start-agent — start a specific agent
  agent
    .command("start-agent <nameOrId>")
    .description("Start a specific agent by name or ID")
    .action(async (nameOrId: string) => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const a = agentManager.get(nameOrId);
      if (!a) {
        clack.log.error(`Agent "${nameOrId}" not found.`);
        return;
      }

      await agentManager.start(a.id);
      clack.log.success(`Agent "${a.name}" started.`);
    });

  // sigil agent pause-agent — pause a specific agent
  agent
    .command("pause-agent <nameOrId>")
    .description("Pause a specific agent by name or ID")
    .action(async (nameOrId: string) => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const a = agentManager.get(nameOrId);
      if (!a) {
        clack.log.error(`Agent "${nameOrId}" not found.`);
        return;
      }

      agentManager.pause(a.id);
      clack.log.success(`Agent "${a.name}" paused.`);
    });

  // sigil agent destroy — destroy a specific agent
  agent
    .command("destroy <nameOrId>")
    .description("Permanently destroy an agent and its wallet")
    .action(async (nameOrId: string) => {
      const { agentManager } = await import(new URL('../../src/agent/AgentManager.js', import.meta.url).href);
      const { getDatabase } = await import(new URL('../../src/lib/Database.js', import.meta.url).href);

      getDatabase();
      const a = agentManager.get(nameOrId);
      if (!a) {
        clack.log.error(`Agent "${nameOrId}" not found.`);
        return;
      }

      if (a.name === "sigil") {
        clack.log.warn(
          "⚠️ You are about to destroy the MAIN agent. Use `sigil agent reset` instead.",
        );
        clack.log.warn(
          "This will delete all data and the wallet for your primary agent.",
        );
      }

      const confirmed = await clack.confirm({
        message: `⚠️ This will permanently delete agent "${a.name}" and its wallet. Continue?`,
        initialValue: false,
      });
      if (clack.isCancel(confirmed) || !confirmed) {
        clack.cancel("Cancelled.");
        return;
      }

      const s = clack.spinner();
      s.start(`Destroying agent "${a.name}"...`);
      await agentManager.destroy(a.id);
      s.stop(`Agent "${a.name}" destroyed.`);
    });
}
