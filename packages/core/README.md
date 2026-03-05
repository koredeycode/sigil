# Sigil Core

The "Brain" and primary backend for Sigil. It orchestrates the LangGraph-based agents, handles the SQLite database initialization, manages the Guardrails security layer, and establishes the local HTTP/WebSocket Server.

## Architecture Highlights
- `src/agent`: LangGraph state machine and tool execution loop.
- `src/wallet`: Isolated layer for secure `keytar` signing operations. No LLMs access this layer directly.
- `src/lib`: `better-sqlite3` data management and Guardrails validation logic.
- `src/server`: Express REST API (`/api/`) and Socket.io WebSocket server (`/agent/<agentId>`).
- `bin`: The CLI application entry points.

## Development
Run the core dev server to boot up APIs on port 7445:
```bash
pnpm run dev
```
