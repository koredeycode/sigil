# Sigil Browser Extension

The browser extension allows seamless interactions between the user's web browsing context and their local Sigil agents. Built using [Plasmo](https://docs.plasmo.com/), it securely communicates with the core backend to pull context, notify agents of web events, and sign requests after passing Guardrails validation.

> **Prerequisite:** You must have the Sigil core server running (`sigil start`) on your machine for the extension to connect and function properly.

## Development

Currently supports Chrome (Manifest V3).

To start the extension development server with hot-reloading:

```bash
pnpm dev
# or load build/chrome-mv3-dev into your browser
```

For production builds:
```bash
pnpm build
```
