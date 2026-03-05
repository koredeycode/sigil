#!/usr/bin/env node

import { Command } from "commander";

import { registerAgentCommand } from "./commands/agent.js";
import { registerAuthCommand } from "./commands/auth.js";
import { registerChatCommand } from "./commands/chat.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerDaemonLogsCommand } from "./commands/daemon-logs.js";
import { registerDashboardCommand } from "./commands/dashboard.js";
import { registerHealthCommand } from "./commands/health.js";
import { registerKillCommand } from "./commands/kill.js";
import { registerLogsCommand } from "./commands/logs.js";
import { registerOnboardCommand } from "./commands/onboard.js";
import { registerProviderCommand } from "./commands/provider.js";
import { registerStartCommand } from "./commands/start.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerStopCommand } from "./commands/stop.js";
import { registerTuiCommand } from "./commands/tui.js";
import { registerTxCommand } from "./commands/tx.js";

const version = "0.1.0";

const program = new Command();

program
  .name("sigil")
  .description("The Local-First Autonomous Agent for Solana")
  .version(version);

// const BANNER = `
//   ███████╗  ██╗   ██████╗   ██╗  ██╗
//   ██╔════╝  ██║  ██╔════╝   ██║  ██║
//   ███████╗  ██║  ██║  ███╗  ██║  ██║
//   ╚════██║  ██║  ██║   ██║  ██║  ██║
//   ███████║  ██║  ╚██████╔╝  ██║  ███████╗
//   ╚══════╝  ╚═╝   ╚═════╝   ╚═╝  ╚══════╝
// `;

// console.log(BANNER);
// console.log('  The Local-First Autonomous Agent for Solana\n');

console.log(`Sigil v${version}`);

// Register all command groups
try {
  registerOnboardCommand(program);
  registerStartCommand(program);
  registerStopCommand(program);
  registerStatusCommand(program);
  registerHealthCommand(program);
  registerDashboardCommand(program);
  registerDaemonLogsCommand(program);
  registerKillCommand(program);
  registerAgentCommand(program);
  registerProviderCommand(program);
  registerChatCommand(program);
  registerConfigCommand(program);
  registerLogsCommand(program);
  registerTxCommand(program);
  registerAuthCommand(program);
  registerTuiCommand(program);
} catch (e) {
  console.error("Failed to register commands", e);
}

program.parse();
