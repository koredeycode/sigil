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
import { createWallet, deleteWallet, getKeypair, importWallet, renameWallet, wipeFromMemory } from '../wallet/Wallet.js';
import { invalidateAgentGraph, invokeSolanaAgent } from './AgentLoop.js';
import { clearAgentKit } from './ToolRegistry.js';

const MAIN_AGENT_NAME = 'sigil';

/**
 * AgentManager — manages a single main Sigil agent.
 * 
 * The system uses one primary agent ("sigil") that handles all
 * chat interactions, tool calls, and directive evaluations.
 * Future sub-agents can be layered on top.
 */
export class AgentManager extends EventEmitter {

  /**
   * Get the main agent, or null if not yet initialized.
   */
  getMainAgent(): AgentRow | undefined {
    return getAgent(MAIN_AGENT_NAME);
  }

  /**
   * Initialize the main agent. Called on first boot or after a reset.
   * Creates the "sigil" agent with a new wallet or imports an existing one.
   */
  async initMainAgent(privateKey?: string): Promise<AgentRow> {
    const existing = this.getMainAgent();
    if (existing) {
      return existing;
    }

    const id = uuidv4();
    let pubkey: string;

    if (privateKey) {
      pubkey = await importWallet(MAIN_AGENT_NAME, privateKey);
    } else {
      pubkey = await createWallet(MAIN_AGENT_NAME);
    }

    dbCreateAgent(id, MAIN_AGENT_NAME, pubkey);

    const agent = getAgent(id)!;
    this.emit('agent:created', { agent: MAIN_AGENT_NAME, pubkey, id });

    return agent;
  }

  /**
   * Create a named agent (for future sub-agent support).
   */
  async create(name: string, loopInterval = 60000, privateKey?: string): Promise<AgentRow> {
    const existing = getAgent(name);
    if (existing) {
      throw new Error(`Agent "${name}" already exists`);
    }

    const id = uuidv4();
    let pubkey: string;

    if (privateKey) {
      pubkey = await importWallet(name, privateKey);
    } else {
      pubkey = await createWallet(name);
    }

    dbCreateAgent(id, name, pubkey, loopInterval);

    const agent = getAgent(id)!;
    this.emit('agent:created', { agent: name, pubkey, id });

    return agent;
  }

  /**
   * Invoke the main agent with a message.
   * If no agentNameOrId is given, uses the main agent.
   */
  async invoke(
    nameOrId?: string,
    message?: string,
    opts?: { includeHistory?: boolean }
  ): Promise<{ response: string; toolResults: Array<{ tool: string; result: string }> }> {
    if (!message && nameOrId) {
      // If only one string arg, treat it as the message to the main agent
      message = nameOrId;
      nameOrId = undefined;
    }

    const agent = nameOrId ? getAgent(nameOrId) : this.getMainAgent();
    if (!agent) throw new Error(nameOrId ? `Agent "${nameOrId}" not found` : 'Main agent not initialized. Run `sigil agent init` first.');
    if (!message) throw new Error('Message is required');

    return invokeSolanaAgent(agent.id, agent.name, message, opts);
  }

  /**
   * Start the main agent (enables cron scheduling for directives).
   */
  async start(nameOrId?: string): Promise<void> {
    const agent = nameOrId ? getAgent(nameOrId) : this.getMainAgent();
    if (!agent) throw new Error('Agent not found');

    await getKeypair(agent.name);
    updateAgentStatus(agent.id, 'running');
    this.emit('agent:status', { agent: agent.name, status: 'running' });
  }

  /**
   * Pause the main agent.
   */
  pause(nameOrId?: string): void {
    const agent = nameOrId ? getAgent(nameOrId) : this.getMainAgent();
    if (!agent) throw new Error('Agent not found');

    updateAgentStatus(agent.id, 'paused');
    this.emit('agent:status', { agent: agent.name, status: 'paused' });
  }

  /**
   * Update agent profile.
   */
  async update(nameOrId: string, newName: string, newInterval: number): Promise<AgentRow> {
    const agent = getAgent(nameOrId);
    if (!agent) throw new Error(`Agent "${nameOrId}" not found`);

    if (newName !== agent.name && getAgent(newName)) {
      throw new Error(`Agent name "${newName}" is already taken`);
    }

    if (newName !== agent.name) {
      await renameWallet(agent.name, newName);
      clearAgentKit(agent.name);
    }

    updateAgentProfile(agent.id, newName, newInterval);
    invalidateAgentGraph(agent.id);

    return getAgent(agent.id)!;
  }

  /**
   * Kill the main agent — wipes keys from memory.
   */
  kill(nameOrId?: string): void {
    const agent = nameOrId ? getAgent(nameOrId) : this.getMainAgent();
    if (!agent) throw new Error('Agent not found');

    wipeFromMemory(agent.name);
    clearAgentKit(agent.name);
    invalidateAgentGraph(agent.id);

    updateAgentStatus(agent.id, 'killed');
    this.emit('agent:status', { agent: agent.name, status: 'killed' });
  }

  /**
   * Destroy an agent — removes all data.
   */
  async destroy(nameOrId: string): Promise<void> {
    const agent = getAgent(nameOrId);
    if (!agent) throw new Error(`Agent "${nameOrId}" not found`);

    clearAgentKit(agent.name);
    invalidateAgentGraph(agent.id);

    await deleteWallet(agent.name);
    dbDeleteAgent(agent.id);

    this.emit('agent:destroyed', { agent: agent.name });
  }

  /**
   * Kill all running agents.
   */
  killAll(): void {
    const agents = getAllAgents();
    for (const agent of agents) {
      if (agent.status === 'running') {
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
   * List all agents.
   */
  list(): AgentRow[] {
    return getAllAgents();
  }

  /**
   * Get an agent by name or ID.
   */
  get(nameOrId: string): AgentRow | undefined {
    return getAgent(nameOrId);
  }

  /**
   * Graceful shutdown.
   */
  shutdown(): void {
    this.killAll();
  }
}

// Singleton
export const agentManager = new AgentManager();
