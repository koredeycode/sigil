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

    return response.json() as unknown as T;
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
}
