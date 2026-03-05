# Sigil Web Dashboard

The Web Dashboard for the Sigil platform, built using React, Vite, Tailwind CSS, and ShadcnUI.

This interface provides a rich, real-time visual dashboard connecting to the Sigil Core via WebSockets. Users can manage agents, configure Guardrails (trade limits, etc.), view a feed of autonomous activities, and interact directly through an integrated chat interface.

## Development

First, ensure the main Core server is running (`pnpm --filter core run dev` from the workspace root).

To run the Web Dashboard in development mode:
```bash
pnpm run dev
```

The web dashboard typically runs on port **7445**.
