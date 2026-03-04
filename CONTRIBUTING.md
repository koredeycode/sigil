# Contributing to Sigil

## File Naming Conventions

To maintain consistency across the Sigil monorepo, please adhere to the following file naming conventions:

- **PascalCase** for:
  - Class files: `AgentManager.ts`
  - React components: `ChatBox.tsx`
  - Type definition files: `Types.ts`

- **camelCase** for:
  - Utility modules: `logger.ts`, `config.ts`
  - React hooks: `useSocket.tsx`, `useApi.tsx`
  - API clients: `api.ts`
  - Express routes: `auth.ts`, `agents.ts`

- **kebab-case** for:
  - CLI commands: `sigil-agent`, `sigil-wallet`
  - Documentation: `getting-started.md`
