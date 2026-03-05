# Sigil TUI

The Terminal UI for the Sigil platform, built using [Ink](https://github.com/vadimdemedes/ink) (React for CLI).

This interface provides a rich, real-time dashboard connecting to the Sigil Core via WebSockets. It allows users to monitor their agents, view execution logs, see running or paused statuses, and issue chat commands directly from the terminal.

## Development

Make sure the main Core server is running first (`pnpm --filter core run dev` from the workspace root).

To run the TUI in development mode:
```bash
pnpm run dev
```

Or run via the main CLI wrapper:
```bash
sigil tui
```
