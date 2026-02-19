import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { authMiddleware } from './middleware/auth.js';
import { agentsRouter } from './routes/agents.js';
import { chatRouter } from './routes/chat.js';
import { configRouter } from './routes/config.js';
import { directivesRouter } from './routes/directives.js';
import { providersRouter } from './routes/providers.js';
import { statusRouter } from './routes/status.js';
import { transactionsRouter } from './routes/transactions.js';
import { setupSocket } from './socket.js';

const API_PORT = 7445;

/**
 * Create and configure the Express app + Socket.IO server.
 */
export function createServer(): { app: express.Express; httpServer: http.Server; io: SocketIOServer } {
  const app = express();
  const httpServer = http.createServer(app);

  // Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [`http://localhost:${API_PORT + 1}`, 'http://localhost:5173'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Public routes (no auth)
  app.use('/api/status', statusRouter);

  // Auth-protected routes
  app.use('/api', authMiddleware);
  app.use('/api/agents', agentsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/directives', directivesRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/providers', providersRouter);
  app.use('/api/config', configRouter);

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  // Setup WebSocket event forwarding
  setupSocket(io);

  return { app, httpServer, io };
}

/**
 * Boot the server.
 */
export function startServer(): Promise<{ io: SocketIOServer }> {
  return new Promise((resolve) => {
    const { httpServer, io } = createServer();

    httpServer.listen(API_PORT, () => {
      console.log(`\n  ⎔ Sigil API server running on http://localhost:${API_PORT}`);
      console.log(`  ⎔ Web Dashboard: http://localhost:${API_PORT + 1}\n`);
      resolve({ io });
    });
  });
}
