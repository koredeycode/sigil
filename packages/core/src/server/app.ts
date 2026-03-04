import cors from 'cors';
import express from 'express';
import http from 'http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import { CONSTANTS } from '../lib/Constants.js';
import { AppError } from '../lib/Errors.js';
import { logger } from '../lib/Logger.js';
import { authMiddleware } from './middleware/auth.js';
import { apiLimiter, authLimiter, llmLimiter } from './middleware/rateLimit.js';
import { agentsRouter } from './routes/agents.js';
import { chatRouter } from './routes/chat.js';
import { configRouter } from './routes/config.js';
import { cronRouter } from './routes/cron.js';
import { extensionRouter } from './routes/extension.js';
import { extensionTokenRouter } from './routes/extensionToken.js';
import { providersRouter } from './routes/providers.js';
import { statusRouter } from './routes/status.js';
import { transactionsRouter } from './routes/transactions.js';
import { walletRouter } from './routes/wallet.js';
import { setupSocket } from './socket.js';
import { attachWebDashboard } from './web.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_PORT = CONSTANTS.PORTS.API;

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
  
  // Rate limits
  app.use('/api', apiLimiter);

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
  app.use('/api/extension/token', authLimiter, extensionTokenRouter);

  // Auth-protected routes
  app.use('/api', authMiddleware);
  app.use('/api/agents', agentsRouter);
  
  // Costly endpoints get an extra LLM rate limiter
  app.use('/api/chat', llmLimiter, chatRouter);
  app.use('/api/extension/simulate', llmLimiter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/providers', providersRouter);
  app.use('/api/config', configRouter);
  app.use('/api/cron', cronRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/extension', extensionRouter);

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Server error', { message: err.message, stack: err.stack });

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        message: err.message,
        data: null,
      });
      return;
    }

    res.status(500).json({ message: 'Internal Server Error', data: null });
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
      logger.info(`Sigil Server (API + Web) running on http://localhost:${API_PORT}`);
      resolve({ io });
    });
  });
}
