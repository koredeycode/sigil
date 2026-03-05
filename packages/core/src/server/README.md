# Sigil Server Layer

Exposes the REST API and WebSocket events for connecting the frontends (TUI, Web, Extension).

## REST API Endpoints (`localhost:7445`)

All endpoints prefixed with `[Auth]` require a Bearer token in the `Authorization` header (`Authorization: Bearer <session-token>`).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/status` | Public | Returns system status |
| GET | `/api/wallet/token` | Public (Rate Limited) | Returns local auth token for the dashboard/extension |
| GET | `/api/agents` | [Auth] | Lists all instantiated agents |
| POST | `/api/agents` | [Auth] | Create a new agent |
| PATCH | `/api/agents/:id/status` | [Auth] | Start, pause, or kill an agent |
| POST | `/api/chat` | [Auth] | Sends a direct message to a specific agent's conversational memory |
| GET | `/api/transactions` | [Auth] | Fetches the recent on-chain history |
| GET | `/api/providers` | [Auth] | Lists active and available LLM providers |
| GET | `/api/config` | [Auth] | Retrieves the global configuration block |
| GET | `/api/cron` | [Auth] | Manages recurring scheduled cron-jobs |
| POST | `/api/wallet/provider/simulate`| [Auth] | Simulates an on-chain transaction |
| GET | `/api/wallet/:agentId` | [Auth] | Wallet specific reads (balances, token holdings) |

## WebSockets (`socket.io`)

Emits real-time streams representing an agent's inner monologue, actions, and validation statuses over the `/agent/<agentId>` namespace.

| Event | Data Payload | Purpose |
|---|---|---|
| `agent:thought` | `{ agentId, text, timestamp }` | The LLM's internal reasoning or chat responses |
| `agent:action_pending` | `{ agentId, toolName, params }` | Emitted when an intent is passed to Guardrails for validation |
| `agent:guardrail_status` | `{ agentId, status: "passed"\|"failed", reason? }` | The result of the intent validation |
| `agent:transaction_success`| `{ agentId, signature, amount, token }` | Emitted when a transaction successfully confirms on Devnet |
| `system:killed` | `{}` (Global Broadcast) | An emergency event causing frontends to lock |
