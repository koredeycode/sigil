# Sigil CLI

The command-line interface for managing Sigil agents, directories, and guardrails.
Built using `commander` for routing and `@clack/prompts` for interactive setups.

## Usage

The CLI is globally available as `sigil` when installed, or via the `dev` scripts.

Commands include:

- `sigil init`: Setup wizard.
- `sigil start`: Boot the server.
- `sigil tui`: Launch terminal UI.
- `sigil kill`: Immediate security halt.
- `sigil agent <cmd>`: Manage individual agents.
- `sigil logs`: View daemon process logs (use --follow to stream in real-time).
