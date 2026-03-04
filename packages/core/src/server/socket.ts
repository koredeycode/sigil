import { Connection, PublicKey } from '@solana/web3.js';
import { Server as SocketIOServer } from 'socket.io';
import { agentManager } from '../agent/AgentManager.js';
import { validateToken } from '../lib/Auth.js';
import { getRpcUrl } from '../lib/Config.js';
import { getAgent } from '../lib/Database.js';
import { logger } from '../lib/Logger.js';


/**
 * Active account subscriptions per agent.
 */
const accountSubscriptions = new Map<string, number>();

/**
 * Set up Socket.IO event forwarding with improved auth and reconnection support.
 */
export function setupSocket(io: SocketIOServer): void {
  // Auth middleware — supports token auth and same-origin bypass
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const origin = socket.handshake.headers.origin || '';

    // Allow same-origin connections (when served from Express)
    if (!origin || origin.includes('localhost:7445')) {
      logger.info(`Same-origin connection from ${socket.id}`);
      next();
      return;
    }

    if (token && validateToken(token)) {
      logger.info(`Authenticated connection from ${socket.id}`);
      next();
    } else {
      logger.warn(`Auth failed for ${socket.id}, trying without token`);
      // For dev, allow all connections
      next();
    }
  });

  // Forward all AgentManager events to Socket.IO
  const events = [
    'agent:thought',
    'agent:action',
    'agent:transaction',
    'agent:error',
    'agent:status',
    'agent:created',
    'agent:destroyed',
    'agent:updated',
    'chat:message',
  ];

  interface AgentEventData {
    agent?: string;
    [key: string]: unknown;
  }

  for (const event of events) {
    agentManager.on(event, (data: AgentEventData) => {
      // Emit to all connected clients
      io.emit(event, data);
    });
  }

  // Handle client connections
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id} (${reason})`);
    });

    // Chat messages from clients
    socket.on('chat:message', async (data: { agentId: string; content: string }) => {
      const agent = getAgent(data.agentId);
      if (!agent) return;

      // Broadcast user message to UI immediately
      agentManager.emit('chat:message', {
        agent: agent.name,
        role: 'user',
        content: data.content,
        timestamp: new Date().toISOString(),
      });

      try {
        const { insertChat } = await import('../lib/Database.js');
        
        // Save user message to DB
        insertChat(agent.id, 'user', data.content);

        // Invoke Agent
        const { response, toolResults } = await agentManager.invoke(agent.id, data.content, {
          includeHistory: true,
        });

        // Save assistant message to DB with stringified tool results
        insertChat(agent.id, 'assistant', response, JSON.stringify(toolResults));

        // Broadcast assistant response and tools to UI
        agentManager.emit('chat:message', {
          agent: agent.name,
          role: 'assistant',
          content: response,
          tools: toolResults,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        logger.error(`Chat Error for agent ${agent.name}`, { error });
        agentManager.emit('agent:error', {
          agent: agent.name,
          error: `Chat failed: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Subscribe to wallet updates for a specific agent
    socket.on('wallet:subscribe', (data: { agentId: string }) => {
      const agent = getAgent(data.agentId);
      if (!agent) return;

      // Set up on-chain account change listener
      if (!accountSubscriptions.has(agent.id)) {
        try {
          const connection = new Connection(getRpcUrl(), 'confirmed');
          const pubkey = new PublicKey(agent.pubkey);

          const subId = connection.onAccountChange(pubkey, (accountInfo) => {
            io.emit('wallet:update', {
              agentId: agent.id,
              agent: agent.name,
              balance: accountInfo.lamports / 1e9,
              timestamp: new Date().toISOString(),
            });
          });

          accountSubscriptions.set(agent.id, subId);
          logger.info(`Subscribed to wallet updates for ${agent.name}`);
        } catch (error) {
          logger.error(`Failed to subscribe to wallet for ${agent.name}`, { error });
        }
      }
    });

    // Unsubscribe from wallet updates
    socket.on('wallet:unsubscribe', (data: { agentId: string }) => {
      const subId = accountSubscriptions.get(data.agentId);
      if (subId !== undefined) {
        try {
          const connection = new Connection(getRpcUrl(), 'confirmed');
          connection.removeAccountChangeListener(subId);
          accountSubscriptions.delete(data.agentId);
        } catch (error) {
          logger.error(`Failed to unsubscribe to wallet for ${data.agentId}`, { error });
        }
      }
    });
  });
}

/**
 * Clean up all account subscriptions.
 */
export function cleanupSubscriptions(): void {
  const connection = new Connection(getRpcUrl(), 'confirmed');
  for (const [agentId, subId] of accountSubscriptions) {
    try {
      connection.removeAccountChangeListener(subId);
    } catch (_) {}
  }
  accountSubscriptions.clear();
}
