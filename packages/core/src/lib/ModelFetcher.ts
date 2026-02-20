/**
 * Dynamically fetches available models from LLM provider APIs.
 * Falls back gracefully if the fetch fails (e.g., invalid key, no network).
 */

interface ModelInfo {
  id: string;
  label: string;
}

const PROVIDER_ENDPOINTS: Record<string, { url: string; parseModels: (data: any) => ModelInfo[] }> = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    parseModels: (data) =>
      (data.data ?? [])
        .filter((m: any) => m.id.startsWith('gpt-'))
        .sort((a: any, b: any) => a.id.localeCompare(b.id))
        .map((m: any) => ({ id: m.id, label: m.id })),
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/models',
    parseModels: (data) =>
      (data.data ?? [])
        .filter((m: any) => !m.id.includes('whisper') && !m.id.includes('safeguard'))
        .sort((a: any, b: any) => a.id.localeCompare(b.id))
        .map((m: any) => ({ id: m.id, label: m.id })),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/models',
    parseModels: (data) =>
      (data.data ?? [])
        .sort((a: any, b: any) => a.id.localeCompare(b.id))
        .map((m: any) => ({ id: m.id, label: m.display_name ?? m.id })),
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    parseModels: (data) =>
      (data.models ?? [])
        .filter((m: any) => m.name?.includes('gemini'))
        .map((m: any) => ({
          id: m.name.replace('models/', ''),
          label: m.displayName ?? m.name.replace('models/', ''),
        })),
  },
  ollama: {
    url: 'http://localhost:11434/api/tags',
    parseModels: (data) =>
      (data.models ?? [])
        .map((m: any) => ({ id: m.name, label: `${m.name} (${formatBytes(m.size)})` })),
  },
  lmstudio: {
    url: 'http://localhost:1234/v1/models',
    parseModels: (data) =>
      (data.data ?? [])
        .map((m: any) => ({ id: m.id, label: m.id })),
  },
};

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
}

/**
 * Fetch available models from a provider.
 * @returns Object containing the models array and/or an error message.
 */
export async function fetchModels(
  providerName: string,
  apiKey?: string | null,
): Promise<{ models: ModelInfo[] | null; error: string | null }> {
  const config = PROVIDER_ENDPOINTS[providerName];
  if (!config) return { models: null, error: `Unknown provider: ${providerName}` };

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Provider-specific auth headers
    if (apiKey) {
      if (providerName === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (['openai', 'groq'].includes(providerName)) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    // Google uses query param
    let url = config.url;
    if (providerName === 'google' && apiKey) {
      url += `?key=${apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
        let errMsg = `HTTP ${res.status} ${res.statusText}`;
        try {
            const errData = await res.json();
            errMsg += ` - ${JSON.stringify(errData.error || errData)}`;
        } catch {}
        return { models: null, error: `API Error: ${errMsg}` };
    }

    const data = await res.json();
    const models = config.parseModels(data);
    return { models: models.length > 0 ? models : null, error: null };
  } catch (err: any) {
    return { models: null, error: `Network/Fetch Error: ${err.message || 'Unknown error'}` };
  }
}
