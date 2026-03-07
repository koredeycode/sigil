#!/usr/bin/env node

// Suppress SQLite experimental warnings in shipped package
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (
    warning.name === "ExperimentalWarning" &&
    warning.message.includes("SQLite")
  ) {
    return;
  }
  console.warn(warning);
});

import { Command } from "commander";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerAgentCommand } from "./commands/agent.js";
import { registerAuthCommand } from "./commands/auth.js";
import { registerChatCommand } from "./commands/chat.js";
import { registerConfigCommand } from "./commands/config.js";
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

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

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
