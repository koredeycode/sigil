export interface Agent {
  id: string;
  name: string;
  pubkey: string;
  status: 'running' | 'paused';
  loop_interval: number;
  created_at: string;
}

export interface ChatMessage {
  id: number | string;
  agent_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  agent: string;
  response: string;
  tools: any[];
}

export interface WalletResponse {
  agent_id: string;
  balance: number;
  transactions: any[];
}

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

  async getAgents(): Promise<Agent[]> {
    return this.fetch<Agent[]>('/agents');
  }

  async getAgent(id: string): Promise<Agent> {
    return this.fetch<Agent>(`/agents/${id}`);
  }

  async createAgent(name: string, intervalSeconds: number): Promise<Agent> {
    return this.fetch<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify({ name, interval: intervalSeconds }),
    });
  }

  async sendChat(agentId: string, message: string): Promise<ChatResponse> {
    return this.fetch<ChatResponse>('/chat', {
        method: 'POST',
        body: JSON.stringify({ agentId, message }),
    });
  }

  async getChats(agentId: string, limit = 10): Promise<ChatMessage[]> {
    return this.fetch<ChatMessage[]>(`/chat/${agentId}?limit=${limit}`);
  }

  async controlAgent(agentId: string, action: 'start' | 'pause' | 'kill'): Promise<Agent> {
    return this.fetch<Agent>(`/agents/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
    });
  }

  async getWallet(agentId: string): Promise<WalletResponse> {
    return this.fetch<WalletResponse>(`/wallet/${agentId}`);
  }
}
