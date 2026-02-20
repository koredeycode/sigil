import { Server as SocketIOServer } from 'socket.io';
import { agentManager } from '../agent/AgentManager.js';
import { validateToken } from '../lib/Auth.js';

/**
 * Set up Socket.IO event forwarding.
 * Agent events are emitted on namespaced paths: /agent/<name>
 * System events are emitted on the /system namespace.
 */
export function setupSocket(io: SocketIOServer): void {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token && validateToken(token)) {
      next();
    } else {
      next(new Error('Unauthorized'));
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
  ];

  interface AgentEventData {
    agent?: string;
    [key: string]: unknown;
  }

  for (const event of events) {
    agentManager.on(event, (data: AgentEventData) => {
      // Emit to the agent-specific namespace
      if (data.agent) {
        io.of(`/agent/${data.agent}`).emit(event, data);
      }
      // Also emit to the default namespace (for global listeners)
      io.emit(event, data);
    });
  }

  // Handle chat messages from clients
  io.on('connection', (socket) => {
    socket.on('chat:message', (data: { agent: string; content: string }) => {
      // Broadcast to all other clients
      socket.broadcast.emit('chat:message', {
        agent: data.agent,
        role: 'user',
        content: data.content,
        timestamp: new Date().toISOString(),
      });
    });
  });
}
