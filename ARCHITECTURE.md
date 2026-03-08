# Architecture Overview

Sigil Wallet operates on a **Tri-Head Architecture** (CLI, TUI, Web Dashboard) connected to a unified Node.js backend (`core`). Agents run continuous autonomous loops (powered by LangGraph) to manage SPL tokens, rebalance portfolios, and execute natural-language directives.

## System Diagram

```mermaid
graph TB
    classDef interface fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff
    classDef api fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    classDef agent fill:#d97706,stroke:#b45309,stroke-width:2px,color:#fff
    classDef db fill:#0f172a,stroke:#334155,stroke-width:2px,color:#fff
    classDef security fill:#dc2626,stroke:#b91c1c,stroke-width:2px,color:#fff
    classDef wallet fill:#7c3aed,stroke:#6d28d9,stroke-width:2px,color:#fff

    subgraph Interfaces ["Tri-Head Interfaces"]
        direction LR
        CLI["Terminal CLI<br/>(Commander)"]:::interface
        TUI["Terminal UI<br/>(Ink)"]:::interface
        WEB["Web Dashboard<br/>(React/Vite)"]:::interface
    end

    subgraph Core ["Sigil Wallet Core System"]
        direction TB
        SERVER["API & WebSocket Server<br/>(Port 7445)"]:::api
        
        subgraph AgentLoop ["Autonomous Loop"]
            direction TB
            AGENT["LangGraph Agent<br/>(LLM Reasoning)"]:::agent
            GUARDRAILS["Guardrails<br/>(Limit & Safety Checks)"]:::security
            CRON["Cron Scheduler<br/>(Scheduled Tasks)"]:::agent
        end
        
        DB[("SQLite Database<br/>(State & Config)")]:::db
    end

    subgraph Execution ["Secure Execution"]
        WALLET{"Wallet Layer<br/>(OS Keychain / Keytar)"}:::wallet
    end

    %% Connections
    CLI <-->|REST / WS| SERVER
    TUI <-->|WS stream| SERVER
    WEB <-->|WS stream| SERVER

    SERVER <-->|User Context| AGENT
    SERVER <-->|Schedules| CRON
    CRON -->|Triggers| AGENT
    AGENT <-->|Read / Write State| DB
    
    AGENT -->|"Proposes Tool Call"| GUARDRAILS
    GUARDRAILS -->|"Failed (Blocks)"| AGENT
    GUARDRAILS -->|"Passed (Safe)"| WALLET
    WALLET -.->|"Broadcasts Tx"| SERVER
```

## Layers & Components

### 1. Agent Layer
The Agent Layer (`/packages/core/src/agent`) is built primarily on **LangGraph**. It handles the continuous reasoning loop of the agent, making decisions, reading context from the database, and issuing *Tool Calls* (intents).
**Crucially**, this layer does not have direct access to private keys or executing blockchain transactions.

### 2. Guardrails Layer
The Guardrails Layer (`/packages/core/src/lib/Guardrails.ts`) acts as the security middleware. When the Agent Layer issues an intent to execute a tool (like a token swap or transfer), the Guardrails Layer intercepts it. It evaluates the intent against limits, directives, and user constraints stored in the SQLite database. If the intent violates these constraints, execution fails and control is handed back to the Agent with the failure reason.

### 3. Wallet Layer
The Wallet Layer (`/packages/core/src/wallet`) is the **only** layer with the authority and capability to access private keys (stored in the **OS Keychain** via `keytar`) and sign transactions via `@solana/web3.js`.

## Data and State
- **Database**: `better-sqlite3` manages state locally on the user's machines. Tables include `agents`, `logs`, `config`, `providers`, `directives`, and `transactions`. The database is synchronous.
- **Security**: Hard security halts (`sigil kill`) trigger memory purges to drop any unlocked `Keypair` instances immediately and broadcast a system-wide websocket event.
