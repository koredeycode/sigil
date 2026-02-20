import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
    AgentRow,
    createAgent as dbCreateAgent,
    deleteAgent as dbDeleteAgent,
    getAgent,
    getAllAgents,
    updateAgentProfile,
    updateAgentStatus,
} from '../lib/Database.js';
import { createWallet, deleteWallet, getKeypair, wipeFromMemory } from '../wallet/Wallet.js';

/**
 * AgentManager — manages the lifecycle of all agents.
 * Maintains a map of active agent loops (setInterval handles).
 */
export class AgentManager extends EventEmitter {
  private loops: Map<string, NodeJS.Timeout> = new Map();
  private cycleRunner: ((agentId: string, agentName: string) => Promise<void>) | null = null;

  /**
   * Set the function that runs on each agent cycle.
   * This is injected by AgentLoop to avoid circular dependencies.
   */
  setCycleRunner(runner: (agentId: string, agentName: string) => Promise<void>): void {
    this.cycleRunner = runner;
  }

  /**
   * Create a new agent with its own wallet.
   */
  async create(name: string, loopInterval = 60000): Promise<AgentRow> {
    // Check for duplicate name
    const existing = getAgent(name);
    if (existing) {
      throw new Error(`Agent "${name}" already exists`);
    }

    const id = uuidv4();
    const pubkey = await createWallet(name);

    dbCreateAgent(id, name, pubkey, loopInterval);

    const agent = getAgent(id)!;

    this.emit('agent:created', { agent: name, pubkey, id });

    return agent;
  }

  /**
   * Start an agent's loop. Loads the wallet key and begins the cycle.
   */
  async start(nameOrId: string): Promise<void> {
    const agent = getAgent(nameOrId);
    if (!agent) throw new Error(`Agent "${nameOrId}" not found`);

    if (this.loops.has(agent.id)) {
      throw new Error(`Agent "${agent.name}" is already running`);
    }

    // Pre-load the keypair into memory
    await getKeypair(agent.name);

    // Update status in DB
    updateAgentStatus(agent.id, 'running');

    // Start the loop
    const loop = setInterval(async () => {
      if (this.cycleRunner) {
        try {
          await this.cycleRunner(agent.id, agent.name);
        } catch (error) {
          this.emit('agent:error', {
            agent: agent.name,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, agent.loop_interval);

    this.loops.set(agent.id, loop);

    this.emit('agent:status', { agent: agent.name, status: 'running' });
  }

  /**
   * Pause an agent — stops the loop but keeps the key in memory.
   * Resuming is instant.
   */
  pause(nameOrId: string): void {
    const agent = getAgent(nameOrId);
    if (!agent) throw new Error(`Agent "${nameOrId}" not found`);

    const loop = this.loops.get(agent.id);
    if (loop) {
      clearInterval(loop);
      this.loops.delete(agent.id);
    }

    updateAgentStatus(agent.id, 'paused');
    this.emit('agent:status', { agent: agent.name, status: 'paused' });
  }

  /**
   * Update an agent's profile (name and interval).
   * If running, applies the new interval immediately by restarting the loop.
   */
  async update(nameOrId: string, newName: string, newInterval: number): Promise<AgentRow> {
    const agent = getAgent(nameOrId);
    if (!agent) throw new Error(`Agent "${nameOrId}" not found`);

    if (newName !== agent.name && getAgent(newName)) {
      throw new Error(`Agent name "${newName}" is already taken`);
    }

    const wasRunning = this.loops.has(agent.id);

    if (wasRunning) {
      this.pause(agent.id); // Stops loop temporarily
    }

    updateAgentProfile(agent.id, newName, newInterval);

    if (wasRunning) {
      await this.start(agent.id); // Restarts loop with new interval
    }

    return getAgent(agent.id)!;
  }

  /**
   * Kill an agent — hard security halt.
   * Stops the loop AND wipes the private key from memory.
   * Restarting requires explicit user action.
   */
  kill(nameOrId: string): void {
    const agent = getAgent(nameOrId);
    if (!agent) throw new Error(`Agent "${nameOrId}" not found`);

    // Stop the loop
    const loop = this.loops.get(agent.id);
    if (loop) {
      clearInterval(loop);
      this.loops.delete(agent.id);
    }

    // Wipe key from memory (stays in Keychain)
    wipeFromMemory(agent.name);

    updateAgentStatus(agent.id, 'killed');
    this.emit('agent:status', { agent: agent.name, status: 'killed' });
  }

  /**
   * Destroy an agent — removes all data and the wallet.
   * The key is removed from OS Keychain.
   */
  async destroy(nameOrId: string): Promise<void> {
    const agent = getAgent(nameOrId);
    if (!agent) throw new Error(`Agent "${nameOrId}" not found`);

    // Stop loop if running
    const loop = this.loops.get(agent.id);
    if (loop) {
      clearInterval(loop);
      this.loops.delete(agent.id);
    }

    // Remove wallet from keychain
    await deleteWallet(agent.name);

    // Remove all agent data from DB
    dbDeleteAgent(agent.id);

    this.emit('agent:destroyed', { agent: agent.name });
  }

  /**
   * Kill all running agents — used for global kill switch and shutdown.
   */
  killAll(): void {
    const agents = getAllAgents();
    for (const agent of agents) {
      if (this.loops.has(agent.id)) {
        this.kill(agent.id);
      }
    }
  }

  /**
   * Start all agents that were previously running.
   */
  async startAll(): Promise<void> {
    const agents = getAllAgents();
    for (const agent of agents) {
      if (agent.status === 'running' || agent.status === 'paused') {
        try {
          await this.start(agent.id);
        } catch (error) {
          this.emit('agent:error', {
            agent: agent.name,
            error: `Failed to auto-start: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  /**
   * Get all agents with their current status.
   */
  list(): AgentRow[] {
    return getAllAgents();
  }

  /**
   * Get a single agent by name or ID.
   */
  get(nameOrId: string): AgentRow | undefined {
    return getAgent(nameOrId);
  }

  /**
   * Check if an agent loop is currently active.
   */
  isRunning(agentId: string): boolean {
    return this.loops.has(agentId);
  }

  /**
   * Graceful shutdown — kill all loops and clean up.
   */
  shutdown(): void {
    for (const [id, loop] of this.loops) {
      clearInterval(loop);
    }
    this.loops.clear();
  }
}

// Singleton instance
export const agentManager = new AgentManager();
