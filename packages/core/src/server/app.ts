import cors from 'cors';
import express from 'express';
import http from 'http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import { authMiddleware } from './middleware/auth.js';
import { agentsRouter } from './routes/agents.js';
import { chatRouter } from './routes/chat.js';
import { configRouter } from './routes/config.js';
import { cronRouter } from './routes/cron.js';
import { extensionRouter } from './routes/extension.js';
import { providersRouter } from './routes/providers.js';
import { statusRouter } from './routes/status.js';
import { transactionsRouter } from './routes/transactions.js';
import { walletRouter } from './routes/wallet.js';
import { setupSocket } from './socket.js';
import { attachWebDashboard } from './web.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Request Logging Middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        console.info(`[API Request] ${req.method} ${req.originalUrl} - ${res.statusCode} (${ms}ms)`);
    });
    next();
  });

  // Public routes (no auth)
  app.use('/api/status', statusRouter);
  app.use('/api/extension', extensionRouter);

  // Auth-protected routes
  app.use('/api', authMiddleware);
  app.use('/api/agents', agentsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/providers', providersRouter);
  app.use('/api/config', configRouter);
  app.use('/api/cron', cronRouter);
  app.use('/api/wallet', walletRouter);

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ message: err.message, data: null });
  });

  // Serve Web Dashboard (Static Site)
  const isDev = __dirname.includes(`src${path.sep}server`) && !__dirname.includes('dist');
  const isCompiled = __dirname.includes(`dist${path.sep}src${path.sep}server`);
  
  let monoRepoRoot = '';
  if (isCompiled) {
      // packages/core/dist/src/server -> ../../../../../.. to root
      // dist/src/server (1) -> dist/src (2) -> dist (3) -> core (4) -> packages (5) -> root
      monoRepoRoot = path.resolve(__dirname, '../../../../..');
  } else if (isDev) {
      // packages/core/src/server -> ../../../..
      // src/server (1) -> src (2) -> core (3) -> packages (4) -> root
      monoRepoRoot = path.resolve(__dirname, '../../../..');
  } else {
      // packages/core -> ../..
      monoRepoRoot = path.resolve(__dirname, '../..');
  }
  
  const webDistPath = path.join(monoRepoRoot, 'packages', 'web', 'dist');
  
  attachWebDashboard(app, webDistPath);

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
      console.log(`\n  ⎔ Sigil Server (API + Web) running on http://localhost:${API_PORT}`);
      resolve({ io });
    });
  });
}
