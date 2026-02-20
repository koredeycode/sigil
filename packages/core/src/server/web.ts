import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Attaches static file serving for the built React web dashboard.
 * Fallbacks to serving index.html for unknown routes to support Client-Side Routing.
 */
export function attachWebDashboard(app: express.Express, webDistPath: string) {
  if (fs.existsSync(webDistPath)) {
    // Serve static files (JS, CSS, images)
    app.use(express.static(webDistPath));

    // Handle React Router fallback (Catch-all for non-API routes)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  } else {
    // Graceful fallback if the web package hasn't been built
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.status(404).send(`
            <h2>Sigil Web Dashboard Not Found</h2>
            <p>The dashboard has not been built yet.</p>
            <p>Run <code>pnpm run build</code> in the <code>packages/web</code> directory.</p>
            <p>Or run the Vite dev server via <code>pnpm run dev:web</code>.</p>
        `);
    });
  }
}
