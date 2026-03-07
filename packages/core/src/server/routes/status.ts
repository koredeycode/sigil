import { Connection } from "@solana/web3.js";
import { Router } from "express";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getRpcUrl } from "../../lib/Config.js";
import { AgentRow, getAllAgents, getDatabase } from "../../lib/Database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Robust version resolution across dev (src/) and prod (dist/src/)
const isCompiled = __dirname.includes(`${join("dist", "src")}`);
const packageJsonPath = isCompiled
  ? join(__dirname, "../../../../package.json")
  : join(__dirname, "../../../package.json");

let version = "0.0.0";
try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  version = packageJson.version;
} catch (e) {
  // Fallback if package.json is missing or unreadable
  console.error(`Warning: Could not read package.json at ${packageJsonPath}`);
}

export const statusRouter: Router = Router();

statusRouter.get("/", async (req, res) => {
  let dbStatus = "disconnected";
  let providersCount = 0;
  let primaryProvider = "none";

  // Database check
  try {
    const db = getDatabase();
    dbStatus = "connected";
    const providers = db
      .prepare("SELECT name, is_primary FROM providers")
      .all() as Array<{ name: string; is_primary: number }>;
    providersCount = providers.length;
    primaryProvider = providers.find((p) => p.is_primary === 1)?.name || "none";
  } catch (error) {
    dbStatus = "error";
  }

  // Agents check
  let agents: AgentRow[] = [];
  try {
    agents = getAllAgents();
  } catch (e) {
    // ignore
  }
  const running = agents.filter((a) => a.status === "running").length;

  // RPC check (optional - can be slow)
  let rpcStatus = "unknown";
  let rpcLatency = 0;
  const includeRpc = req.query.rpc === "true";
  
  if (includeRpc) {
    try {
      const rpcUrl = getRpcUrl();
      const connection = new Connection(rpcUrl, 'confirmed');
      const start = Date.now();
      await connection.getSlot();
      rpcLatency = Date.now() - start;
      rpcStatus = "healthy";
    } catch (error) {
      rpcStatus = "error";
    }
  }

  res.json({
    message: "Status retrieved successfully",
    data: {
      status: dbStatus === "connected" && rpcStatus !== "error" ? "ok" : "degraded",
      version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),

      // Core components
      database: {
        status: dbStatus,
        location: "~/.sigil/sigil.db"
      },

      llmProviders: {
        configured: providersCount,
        primary: primaryProvider,
      },

      agents: {
        total: agents.length,
        running,
        paused: agents.length - running,
      },

      // Network
      network: {
        rpc: getRpcUrl(),
        status: includeRpc ? rpcStatus : "skipped (use ?rpc=true)",
        latency: rpcLatency > 0 ? `${rpcLatency}ms` : null,
      },

      // System
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        }
      }
    },
  });
});
