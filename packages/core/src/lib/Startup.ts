import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the absolute path to the sigil CLI entry point.
 */
function resolveCliPath(): string {
  // Try `which` / `where` to find the globally-installed binary
  const whichCmd = process.platform === 'win32' ? 'where sigil' : 'which sigil';
  try {
    const sigilPath = execSync(whichCmd, { encoding: 'utf8' }).trim().split('\n')[0];
    if (sigilPath) {
      return fs.realpathSync(sigilPath);
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: resolve relative to this file
  // This file: dist/src/lib/Startup.js  →  CLI: dist/bin/cli.js
  const distDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
  const cliPath = path.join(distDir, 'bin', 'cli.js');
  if (fs.existsSync(cliPath)) {
    return cliPath;
  }

  throw new Error(
    'Could not locate the Sigil CLI entry point. Ensure sigil is installed globally or built.'
  );
}

// ---------------------------------------------------------------------------
// Linux — systemd user service
// ---------------------------------------------------------------------------

function linuxServicePath(): string {
  return path.join(os.homedir(), '.config', 'systemd', 'user', 'sigil.service');
}

function enableLinux(): void {
  const nodePath = process.execPath;
  const cliPath = resolveCliPath();
  const nodeBinDir = path.dirname(nodePath);
  const envPath = `${nodeBinDir}:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'}`;

  const unit = `[Unit]
Description=Sigil — Local-First Autonomous Agent for Solana
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${nodePath} ${cliPath} start --fg
Restart=on-failure
RestartSec=5
Environment=HOME=${os.homedir()}
Environment=PATH=${envPath}
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
`;

  const serviceFile = linuxServicePath();
  fs.mkdirSync(path.dirname(serviceFile), { recursive: true });
  fs.writeFileSync(serviceFile, unit, { mode: 0o644 });

  execSync('systemctl --user daemon-reload', { stdio: 'pipe' });
  execSync('systemctl --user enable sigil.service', { stdio: 'pipe' });
}

function disableLinux(): void {
  try {
    execSync('systemctl --user disable sigil.service', { stdio: 'pipe' });
  } catch { /* may not exist */ }

  const serviceFile = linuxServicePath();
  if (fs.existsSync(serviceFile)) {
    fs.unlinkSync(serviceFile);
  }

  try {
    execSync('systemctl --user daemon-reload', { stdio: 'pipe' });
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// macOS — launchd plist
// ---------------------------------------------------------------------------

const PLIST_LABEL = 'com.sigil.agent';

function macPlistPath(): string {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `${PLIST_LABEL}.plist`);
}

function enableMac(): void {
  const nodePath = process.execPath;
  const cliPath = resolveCliPath();
  const logDir = path.join(os.homedir(), '.sigil');
  fs.mkdirSync(logDir, { recursive: true });

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${cliPath}</string>
    <string>start</string>
    <string>--fg</string>
  </array>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>

  <key>StandardOutPath</key>
  <string>${path.join(logDir, 'daemon.log')}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(logDir, 'daemon.log')}</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${path.dirname(nodePath)}:/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key>
    <string>${os.homedir()}</string>
    <key>NODE_ENV</key>
    <string>production</string>
  </dict>
</dict>
</plist>
`;

  const plistFile = macPlistPath();
  fs.mkdirSync(path.dirname(plistFile), { recursive: true });
  fs.writeFileSync(plistFile, plist, { mode: 0o644 });

  // Load the agent (don't use `load -w`, it's deprecated)
  try {
    execSync(`launchctl bootstrap gui/$(id -u) ${plistFile}`, { stdio: 'pipe' });
  } catch {
    // Fallback for older macOS
    try {
      execSync(`launchctl load ${plistFile}`, { stdio: 'pipe' });
    } catch { /* ignore */ }
  }
}

function disableMac(): void {
  const plistFile = macPlistPath();

  try {
    execSync(`launchctl bootout gui/$(id -u) ${plistFile}`, { stdio: 'pipe' });
  } catch {
    try {
      execSync(`launchctl unload ${plistFile}`, { stdio: 'pipe' });
    } catch { /* ignore */ }
  }

  if (fs.existsSync(plistFile)) {
    fs.unlinkSync(plistFile);
  }
}

// ---------------------------------------------------------------------------
// Windows — VBS script in Startup folder
// ---------------------------------------------------------------------------

function windowsStartupPath(): string {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(
    appData,
    'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup',
    'sigil.vbs'
  );
}

function enableWindows(): void {
  const nodePath = process.execPath;
  const cliPath = resolveCliPath();

  // A VBS script that launches sigil silently (no visible console window)
  const vbs = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """${nodePath}"" ""${cliPath}"" start --fg", 0, False
`;

  const startupFile = windowsStartupPath();
  fs.mkdirSync(path.dirname(startupFile), { recursive: true });
  fs.writeFileSync(startupFile, vbs, { encoding: 'utf8' });
}

function disableWindows(): void {
  const startupFile = windowsStartupPath();
  if (fs.existsSync(startupFile)) {
    fs.unlinkSync(startupFile);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Registers Sigil to auto-start on boot for the current platform.
 * Called automatically by `sigil start`.
 * Fails silently — auto-start is a convenience, not a hard requirement.
 */
export function enableAutoStart(): void {
  try {
    switch (process.platform) {
      case 'linux':
        enableLinux();
        break;
      case 'darwin':
        enableMac();
        break;
      case 'win32':
        enableWindows();
        break;
      default:
        // Unsupported platform — silently skip
        break;
    }
  } catch {
    // Auto-start is best-effort; don't crash the main flow
  }
}

/**
 * Removes Sigil from auto-start on boot for the current platform.
 * Called automatically by `sigil stop`.
 * Fails silently.
 */
export function disableAutoStart(): void {
  try {
    switch (process.platform) {
      case 'linux':
        disableLinux();
        break;
      case 'darwin':
        disableMac();
        break;
      case 'win32':
        disableWindows();
        break;
      default:
        break;
    }
  } catch {
    // Best-effort cleanup
  }
}
