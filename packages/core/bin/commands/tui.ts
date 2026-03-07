import * as clack from "@clack/prompts";
import { Command } from "commander";

export function registerTuiCommand(program: Command) {
  program
    .command("tui")
    .description("Launch the Terminal User Interface")
    .action(async () => {
      const { getAuthToken } = await import(new URL('../../src/lib/Config.js', import.meta.url).href);
      const token = getAuthToken();

      if (!token) {
        clack.log.error('Error: No auth token found. Run "sigil init" first.');
        process.exit(1);
      }

      const API_PORT = 7445;
      // Clear screen before starting TUI
      console.clear();
      const { startTui } = await import(new URL('../../src/lib/TuiLoader.js', import.meta.url).href);
      const app = await startTui(API_PORT, token);
      await app.waitUntilExit();
    });
}
