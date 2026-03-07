#!/usr/bin/env node

/**
 * Bundle script: Builds and copies TUI + Web UI into the core package for npm publishing.
 * Run this before `npm publish`.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.resolve(__dirname, "../../..");
const CORE_PACKAGE = path.resolve(__dirname, "..");
const TUI_PACKAGE = path.resolve(MONOREPO_ROOT, "packages/tui");
const WEB_PACKAGE = path.resolve(MONOREPO_ROOT, "packages/web");

const BUNDLED_TUI_DIR = path.join(CORE_PACKAGE, "bundled/tui");
const BUNDLED_WEB_DIR = path.join(CORE_PACKAGE, "bundled/web");

console.log("🎁 Starting bundle process...\n");

// Step 1: Clean previous bundles
console.log("🧹 Cleaning previous bundles...");
if (fs.existsSync(path.join(CORE_PACKAGE, "bundled"))) {
  fs.rmSync(path.join(CORE_PACKAGE, "bundled"), {
    recursive: true,
    force: true,
  });
}
fs.mkdirSync(BUNDLED_TUI_DIR, { recursive: true });
fs.mkdirSync(BUNDLED_WEB_DIR, { recursive: true });

// Step 2: Build TUI
console.log("\n📱 Building TUI package...");
execSync("pnpm build", { cwd: TUI_PACKAGE, stdio: "inherit" });

// Step 3: Build Web
console.log("\n🌐 Building Web package...");
execSync("pnpm build", { cwd: WEB_PACKAGE, stdio: "inherit" });

// Step 4: Copy TUI dist
console.log("\n📦 Copying TUI dist...");
copyRecursive(path.join(TUI_PACKAGE, "dist"), BUNDLED_TUI_DIR);
copyRecursive(
  path.join(TUI_PACKAGE, "package.json"),
  path.join(BUNDLED_TUI_DIR, "package.json"),
);

// Fix package.json paths (remove "dist/" prefix since files are copied to root)
const tuiPkgPath = path.join(BUNDLED_TUI_DIR, "package.json");
const tuiPkg = JSON.parse(fs.readFileSync(tuiPkgPath, "utf-8"));
if (tuiPkg.main) tuiPkg.main = tuiPkg.main.replace(/^dist\//, "");
if (tuiPkg.types) tuiPkg.types = tuiPkg.types.replace(/^dist\//, "");
if (tuiPkg.exports) {
  tuiPkg.exports = JSON.parse(
    JSON.stringify(tuiPkg.exports).replace(/"\.\/dist\//g, '"./'),
  );
}
fs.writeFileSync(tuiPkgPath, JSON.stringify(tuiPkg, null, 2));

// Step 5: Copy Web dist
console.log("📦 Copying Web dist...");
copyRecursive(path.join(WEB_PACKAGE, "dist"), BUNDLED_WEB_DIR);

// Step 6: Build core package
console.log("\n🏗️  Building Core package...");
execSync("pnpm build", { cwd: CORE_PACKAGE, stdio: "inherit" });

console.log("\n✅ Bundle complete! Ready for npm publish.\n");
console.log("📂 Bundled assets:");
console.log(`   - TUI: ${BUNDLED_TUI_DIR}`);
console.log(`   - Web: ${BUNDLED_WEB_DIR}`);
console.log("\nNext steps:");
console.log("  1. npm publish");
console.log("  2. npm install -g sigil-wallet");

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source does not exist: ${src}`);
  }

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}
