import { Connection } from "@solana/web3.js";
import { Router } from "express";
import { getRpcUrl } from "../../lib/Config.js";
import { AgentRow, getAllAgents, getDatabase } from "../../lib/Database.js";

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
      version: "0.1.0",
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
