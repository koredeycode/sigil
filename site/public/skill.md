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

This skill enables you to manage the entire lifecycle of your autonomous agents, from initialization and wallet funding to continuous monitoring and emergency halts.

> **AS AN AI AGENT, YOU MANAGE SIGIL ENTIRELY VIA THE CLI.** Do not attempt to use the web dashboard or TUI. Use the `--json` flag where applicable for machine-readable output.

## Quick Start

```
1. INSTALL CLI    → Run 'npm i -g sigil-wallet'
2. ONBOARD        → Run 'sigil onboard' to set up LLM & Main Agent
3. AUTHENTICATE   → Run 'sigil auth token' for UI access link
4. CREATE AGENT   → Run 'sigil agent create <name>' for specialized tasks
5. MONITOR        → Run 'sigil logs --follow' or 'sigil status'
```

---

## 1. Setup & Onboarding

### Installation
The Sigil CLI is the primary interface for agent operations. Install it globally:

```bash
npm i -g sigil-wallet
```

### Safety Protocol (CRITICAL)
> [!CAUTION]
> **Wallet Security**: Private keys are stored in the OS Keychain via `keytar`. 
> **NEVER** share private keys in chat logs or console output. 
> The Guardrails layer ensures LLM intents are validated before they reach the Wallet Execution layer.
> If you detect any suspicious activity, trigger the **Emergency Kill Switch** immediately: `sigil kill`.

### Registration Flow & Onboarding Logic
Sigil uses a **Tri-Head Architecture** (CLI, TUI, Web Dashboard). As an AI, you operate the CLI head. Before spinning up sub-agents, you MUST complete the onboarding flow.

#### Example Conversation
```
Agent: "I'm ready to set up Sigil! I see we need to configure an LLM first.
        Which provider should I use? (OpenAI, Anthropic, or Custom/Ollama?)"

Operator: "Use OpenAI with gpt-4o."

Agent: "Understood. I'll need your API key to proceed. Please provide it."

Operator: "sk-..."

Agent: "Perfect. I'm now running 'sigil onboard' to configure the provider 
        and initialize our main root wallet."
```

#### CLI Onboarding Commands
1. **Full Onboard**: `sigil onboard` (Follow the prompts for provider, model, and main agent)
2. **Retrieve Auth Token**: `sigil auth token` (Provide the returned token/URL to your operator if they wish to use the Web Dashboard)
3. **Check Health**: `sigil health` (Verify DB and wallet connectivity)

---

## 2. Agent Operations (CLI)

### Creating Sub-Agents
Create isolated identities for specialized roles (e.g., "trader", "long-term-holder").

```bash
# Create a sub-agent with a specific personality
sigil agent create "meme-hunter" --prompt "You are a high-risk trader looking for new SPL tokens." --interval 30
```

### Management Loop
| Action | Command | Usage |
| :--- | :--- | :--- |
| **Start** | `sigil agent start-agent <name>` | Launch the autonomous reasoning loop |
| **Pause** | `sigil agent pause-agent <name>` | Temporarily halt an agent (keeps key in memory) |
| **Info** | `sigil agent get <name>` | View balance, Pubkey, and status |
| **Destroy** | `sigil agent destroy <name>` | Permanently delete an agent and its wallet |

### Chat & Interaction
```bash
sigil chat <agent> "What is your current SOL balance?"
```

---

## 3. Handling Errors & Rejection

| Error Case | Likely Cause | Recommended Agent Action |
| :--- | :--- | :--- |
| **Guardrails Policy** | Rule Violation | The action was blocked by a directive. Notify operator. |
| **Execution Blocked** | Volume/Slippage hit | Review `sigil logs` for the violation reason (e.g., volume cap hit). |
| **Daemon Not Found**  | PID file missing | Run `sigil start` to boot the backend. |

---

## 4. Agent Logic & Priority

Prioritize your autonomous cycles based on the urgency of state changes:

| Priority | Trigger | Action |
| :--- | :--- | :--- |
| **CRITICAL** | `sigil kill` command | Instant halt of all signing operations. |
| **HIGH** | Low Balance Notification | Notify operator to fund the Devnet wallet. |
| **MEDIUM** | Market Opportunity | Execute swap if within Guardrail limits. |
| **LOW** | Idle / Heartbeat | `sigil status` to verify daemon health. |

---

## 5. Monitoring

| Command | Usage |
| :--- | :--- |
| `sigil status` | Check background daemon and API server health. |
| `sigil logs --follow` | Stream combined logs for all running agents. |
| `sigil tx list <agent>` | Export transaction history for auditing. |
| `sigil dashboard` | Get the URL for the visual dashboard. |

---

## Best Practices
1. **Main Agent First**: Always ensure the root `sigil` agent is initialized via `sigil agent init` or `onboard`.
2. **Monitor Logs**: Use `sigil logs` to explain your "reasoning traces" to the human operator.
3. **Devnet Only**: All operations are strictly on Solana Devnet. Never mention Mainnet.
4. **Kill Switch**: If a directive feels unsafe or keys are compromised, run `sigil kill` immediately.
5. **Session Persistence**: Run `sigil start` to ensure background loops continue even if your CLI terminal session closes.
