import { Router } from 'express';
import { encryptApiKey } from '../../lib/Auth.js';
import {
    addProvider,
    getAllProviders,
    removeProvider,
    setPrimaryProvider,
} from '../../lib/Database.js';

export const providersRouter: Router = Router();

// GET /api/providers — list all providers
providersRouter.get('/', (_req, res) => {
  const providers = getAllProviders();
  // Strip API keys from response
  const sanitized = providers.map((p) => ({
    ...p,
    api_key: p.api_key ? '••••••••' : null,
  }));
  res.json({ message: 'Providers retrieved successfully', data: sanitized });
});

// POST /api/providers — add a provider
providersRouter.post('/', (req, res) => {
  try {
    const { name, apiKey, model, isPrimary } = req.body;
    if (!name || !model) {
      res.status(400).json({ error: 'name and model are required' });
      return;
    }
    const encryptedKey = apiKey ? encryptApiKey(apiKey) : null;
    const result = addProvider(name, encryptedKey, model, isPrimary ?? false);
    res.status(201).json({ message: 'Provider created successfully', data: {
      id: Number(result.lastInsertRowid),
      name,
      model,
      isPrimary: isPrimary ?? false,
    }});
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// PATCH /api/providers/:id — set as primary
providersRouter.post('/primary', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ message: 'Provider ID is required', data: null });
      return;
    }

    setPrimaryProvider(Number(id));
    res.json({ message: 'Primary provider set successfully', data: { id } });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

providersRouter.post('/models', async (req, res) => {
  try {
    const { provider, apiKey, baseUrl } = req.body;
    if (!provider || !apiKey) {
      res.status(400).json({ message: 'Provider and API Key are required', data: null });
      return;
    }

    const { fetchModelsForProvider } = await import('../../lib/ModelFetcher.js');
    const models = await fetchModelsForProvider(provider, apiKey, baseUrl);
    
    res.json({ message: 'Models fetched successfully', data: models });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});

// DELETE /api/providers/:id — remove a provider
providersRouter.delete('/:id', (req, res) => {
  try {
    removeProvider(Number(req.params.id));
    res.status(204).json({ message: 'Provider deleted', data: null });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : String(error), data: null });
  }
});
