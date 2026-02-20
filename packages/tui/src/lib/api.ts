export class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor(port: number, token: string) {
    this.baseUrl = `http://localhost:${port}/api`;
    this.token = token;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...options?.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const json = await response.json() as any;
    if (json.data !== undefined) {
      return json.data as T;
    }
    return json as T;
  }

  async getAgents() {
    return this.fetch<any[]>('/agents');
  }

  async getAgent(id: string) {
    return this.fetch<any>(`/agents/${id}`);
  }

  async createAgent(name: string, intervalSeconds: number) {
    return this.fetch('/agents', {
      method: 'POST',
      body: JSON.stringify({ name, interval: intervalSeconds }),
    });
  }

  async sendChat(agentId: string, message: string) {
    return this.fetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ agentId, message }),
    });
  }

  async getChats(agentId: string, limit = 10) {
    return this.fetch<any[]>(`/chat/${agentId}?limit=${limit}`);
  }

  async controlAgent(agentId: string, action: 'start' | 'pause' | 'kill') {
    return this.fetch(`/agents/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
    });
  }
}
