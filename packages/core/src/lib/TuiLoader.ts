/**
 * TUI Loader - Dynamically loads the bundled or workspace TUI package.
 * This allows the npm package to work with bundled TUI while maintaining
 * development workflow with workspace dependencies.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the TUI module path based on runtime context.
 */
function getTuiModulePath(): string {
  const isCompiled = __dirname.includes(`dist${path.sep}src${path.sep}lib`);

  if (isCompiled) {
    // Check for bundled TUI in npm package: dist/src/lib -> ../../bundled/tui
    const bundledPath = path.resolve(__dirname, "../../bundled/tui/index.js");
    if (fs.existsSync(bundledPath)) {
      return bundledPath;
    }
  }

  // Fallback to workspace dependency (development)
  return "sigil-tui";
}

/**
 * Load and start the TUI application.
 * Returns a Promise that resolves to the TUI app instance.
 */
export async function startTui(apiPort: number, authToken: string) {
  const tuiModulePath = getTuiModulePath();
  const tuiModule = await import(tuiModulePath);
  return tuiModule.startTui(apiPort, authToken);
}
