---
name: sigil
description: Local-first autonomous AI agent platform designed exclusively for Solana Devnet.
version: 1.0.0
author: Sigil Team
requirements:
  - curl
  - jq
  - npm (for CLI)
tags:
  - ai-agents
  - solana
  - portfolio-management
---

# Sigil: Autonomous AI Agent Platform for Solana Devnet

Sigil is a local-first platform where you can build autonomous agents that manage Solana wallets on your behalf. Every agent runs locally on your machine, stores keys in your OS Keychain, and enforces hard-coded safety guardrails.

> **AS AN AI AGENT, YOU MANAGE SIGIL ENTIRELY VIA THE CLI.** Do not attempt to use the web dashboard or TUI.

## Quick Start

1. INSTALL CLI    → Run `npm i -g sigil` or use `npx sigil@latest`
2. INITIALIZE     → Run `sigil init` to select an LLM provider and generate keys
3. CREATE AGENT   → Run `sigil agent create --name <name>`
4. START AGENT    → Run `sigil agent start <name>`

---

## 1. Setup & Onboarding

### Installation
The Sigil CLI is the primary interface:
```bash
npm i -g sigil
```

### Registration Flow & Setup
Before spinning up an agent, set up your configuration:
1. Initialize the workspace: `sigil init` (Follow the prompts to add API keys for your preferred LLM)
2. Create your agent: `sigil agent create --name <agent-name>`

### Architecture
Sigil enforces strict wallet isolation:
- **Agent Layer**: Produces tool intents.
- **Guardrails Layer**: Validates all generated intents against limits (volume, slippage, etc).
- **Wallet Layer**: Keytar-based local signing of approved transactions. Your keys never leave your device.

---

## 2. CLI Reference (Headless Management)

As an AI system, you should monitor and control agents primarily through these CLI commands. You must start the API server (`sigil start`) in the background if another application (like a browser extension) needs to talk to the agents.

| Category | Command | Usage |
| :--- | :--- | :--- |
| **Workspace** | `sigil status` | Show server and agent status |
| | `sigil start` | Boot the API server and start agent intervals |
| | `sigil kill` | Emergency block — drops wallet Keypairs from memory |
| **Agents** | `sigil agent list` | List all available agents |
| | `sigil agent create --name <name>`| Initialize a new isolated wallet logic core |
| | `sigil agent start <name>` | Resume an agent's specific reasoning loop |
| | `sigil agent pause <name>` | Pause the loop (leaves keys mapped temporarily) |
| | `sigil agent info <name>` | Dump balances, metadata, and state |
| | `sigil chat <agent> "<prompt>"` | Speak directly to an agent context window |
| **Logs** | `sigil logs <agent>` | Print the action, error, and thinking log |
| | `sigil tx list <agent>` | List all successfully completed Devnet transactions |
| **Settings**| `sigil provider list` | List loaded LLMs |
| | `sigil config set --loop-interval <sec>` | Adjust loop speed |

### Working Directory
All databases and configurations are securely located at `~/.sigil/sigil.db`. Do not edit the sqlite directly; use the CLI.
