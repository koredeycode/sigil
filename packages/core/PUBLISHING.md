# Publishing Sigil to npm

This guide explains how to publish the bundled Sigil package (with TUI and Web UI) to npm.

## Prerequisites

1. **npm account**: Create at account at https://www.npmjs.com/signup
2. **Package name**: Published as `sigil-wallet` on npm (https://www.npmjs.com/package/sigil-wallet)
   - If changing the name, update the `name` field in `package.json`
3. **Add package metadata**: Update these fields in `package.json`:
   - `author`: Your name and email
   - `homepage`: Your GitHub repo URL
   - `repository`: Your GitHub repo URL
   - `license`: Verify license type (default: MIT)

## Publishing Steps

### 1. Install Dependencies

```bash
cd packages/core
pnpm install
```

### 2. Run Bundle Script

This builds TUI, Web, and Core packages, then bundles everything together:

```bash
pnpm run bundle
```

This will:

- Build `packages/tui` → `packages/core/bundled/tui/`
- Build `packages/web` → `packages/core/bundled/web/`
- Build `packages/core` → `packages/core/dist/`

### 3. Test Locally

Before publishing, test the bundled package locally:

```bash
# Link package globally
npm link

# Test the CLI
sigil --version
sigil --help

# Test starting the server
sigil start

# Unlink when done
npm unlink -g sigil-wallet
```

### 4. Login to npm

```bash
npm login
# or
npm adduser
```

### 5. Verify Package Contents

Review what will be published:

```bash
npm pack --dry-run
```

Or create an actual tarball to inspect:

```bash
npm pack
tar -tzf sigil-wallet-0.1.0.tgz
```

### 6. Publish to npm

```bash
npm publish
```

For scoped packages (e.g., `@yourorg/sigil-wallet`):

```bash
npm publish --access public
```

### 7. Test Installation

```bash
# Install globally from npm
npm install -g sigil-wallet

# Verify it works
sigil --version
sigil --help
```

## Automatic Bundling

The `prepublishOnly` script automatically runs `pnpm run bundle` before publishing, so you can also just run:

```bash
npm publish
```

And it will handle bundling automatically.

## Development Workflow

During development, you can still use workspace dependencies:

```bash
# From monorepo root
pnpm dev:core    # Run core server
pnpm dev:tui     # Run TUI in watch mode
pnpm dev:web     # Run web UI with Vite dev server
```

The code automatically detects development vs production mode and loads the appropriate modules.

## Version Management & Publishing Workflow

Sigil follows [Semantic Versioning (SemVer)](https://semver.org/). When you are ready to release changes, use the following commands to bump the version and publish:

### 1. Patch Release (0.0.x)
Use this for backwards-compatible bug fixes or minor documentation updates.
```bash
npm version patch  # Bumps 0.2.2 -> 0.2.3
npm publish
```

### 2. Minor Release (0.x.0)
Use this for adding new features that are backwards-compatible.
```bash
npm version minor  # Bumps 0.2.2 -> 0.3.0
npm publish
```

### 3. Major Release (x.0.0)
Use this for breaking changes or significant architectural shifts.
```bash
npm version major  # Bumps 0.2.2 -> 1.0.0
npm publish
```

> [!NOTE]
> The `npm version` command automatically creates a git tag and updates `package.json`. Make sure you have a clean git state before running these.

## Local & Offline Installation

If you need to share or install Sigil without publishing it to the public npm registry (e.g., for internal testing or offline environments), you can use the tarball method.

### 1. Generate the Tarball
First, ensure the package is bundled and ready:
```bash
pnpm run bundle
npm pack
```
This generates a file like `sigil-wallet-0.2.2.tgz` in your current directory.

### 2. Manual/Offline Installation
You can install this tarball directly on any machine with Node.js and npm installed:
```bash
# On the target machine
npm install -g ./sigil-wallet-0.2.2.tgz
```

### 3. Verification
Once installed, verify the installation as usual:
```bash
sigil --version
```

## Troubleshooting

### Package name already taken

- Change `name` in `package.json` to something unique
- Consider using a scoped package: `@yourorg/sigil-wallet`

### Bundle script fails

- Ensure all dependencies are installed: `pnpm install --filter sigil-tui --filter sigil-web --filter sigil-wallet`
- Check that TUI and Web packages build successfully independently

### TUI or Web UI not loading after install

- Verify `bundled/` directory exists in the tarball
- Check file paths in `TuiLoader.ts` and `Config.ts`

### SQLite warnings appearing

- Verify the warning suppression code is in `bin/cli.ts` and `src/index.ts`

## Files Included in npm Package

- `dist/` - Compiled TypeScript
- `bundled/tui/` - Built TUI application
- `bundled/web/` - Built web dashboard
- `README.md` - Documentation

## Files Excluded from npm Package

- `src/`, `bin/`, `tests/`, `scripts/` - Source files
- `node_modules/` - Dependencies (installed by users)
- Configuration files - `tsconfig.json`, etc.
- `.env` files

## Next Steps

After publishing:

1. Update project README with installation instructions
2. Create a GitHub release
3. Announce on social media/Discord/forums
4. Monitor npm downloads and issues
