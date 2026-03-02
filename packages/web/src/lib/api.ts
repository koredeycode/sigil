import axios from 'axios';

export interface Agent {
  id: string;
  name: string;
  pubkey: string;
  status: 'running' | 'paused';
  loop_interval: number;
  prompt: string | null;
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

export interface AgentLog {
  id: number;
  agent_id: string;
  timestamp: string;
  action: string;
  result: string | null;
  thought: string | null;
}

export interface Transaction {
  id: number;
  agent_id: string;
  timestamp: string;
  type: string;
  token: string | null;
  amount: number | null;
  recipient: string | null;
  signature: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  fee: number | null;
}

export interface Provider {
  id: number;
  name: string;
  api_key: string | null;
  model: string;
  is_primary: number;
  added_at: string;
}

export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
}

export class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string, port: number = 7445) {
    this.baseUrl = `http://localhost:${port}/api`;
    this.token = token;
  }

  private async request<T>(method: string, endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios({
        method,
        url,
        headers,
        data,
      });
      return response.data; // response.data is the ApiResponse { message, data }
    } catch (error: any) {
      console.error(`API Error ${method} ${endpoint}:`, error.message);
      // Construct standardized error back to client
      if (error.response?.data) {
          throw error.response.data;
      }
      throw { message: error.message, data: null };
    }
  }

  async getAgents(): Promise<ApiResponse<Agent[]>> {
    return this.request<Agent[]>('GET', '/agents');
  }

  async getAgent(id: string): Promise<ApiResponse<Agent>> {
    return this.request<Agent>('GET', `/agents/${id}`);
  }

  async createAgent(name: string, loopInterval: number, privateKey?: string, prompt?: string): Promise<ApiResponse<Agent>> {
    return this.request<Agent>('POST', '/agents', { name, loopInterval, privateKey, prompt });
  }

  async updateAgent(id: string, name: string, loopInterval: number, prompt?: string): Promise<ApiResponse<Agent>> {
    return this.request<Agent>('PUT', `/agents/${id}`, { name, loopInterval, prompt });
  }

  async sendChat(agentId: string, message: string): Promise<ApiResponse<ChatResponse>> {
    return this.request<ChatResponse>('POST', '/chat', { agentId, message });
  }

  async getChats(agentId: string, limit = 100): Promise<ApiResponse<ChatMessage[]>> {
    return this.request<ChatMessage[]>('GET', `/chat/${agentId}?limit=${limit}`);
  }

  async controlAgent(agentId: string, action: 'start' | 'pause' | 'kill'): Promise<ApiResponse<Agent>> {
    return this.request<Agent>('PATCH', `/agents/${agentId}`, { action });
  }

  async getTransactions(agentId: string): Promise<ApiResponse<Transaction[]>> {
    return this.request<Transaction[]>('GET', `/transactions?agentId=${agentId}&limit=50`);
  }

  // --- Providers ---
  async getProviders(): Promise<ApiResponse<Provider[]>> {
    return this.request<Provider[]>('GET', '/providers');
  }

  async setPrimaryProvider(id: number): Promise<ApiResponse<any>> {
    return this.request('POST', `/providers/primary`, { id });
  }

  async fetchModels(provider: string, apiKey: string, baseUrl?: string): Promise<ApiResponse<{ models?: { id: string; label: string }[]; error?: string }>> {
    return this.request<{ models?: { id: string; label: string }[]; error?: string }>('POST', '/providers/models', { provider, apiKey, baseUrl });
  }

  async addProvider(provider: string, apiKey: string, model: string, baseUrl?: string, compat?: string): Promise<ApiResponse<any>> {
    return this.request('POST', '/providers', { name: provider, apiKey, model, baseUrl, compat });
  }

  async deleteProvider(id: number): Promise<ApiResponse<void>> {
    return this.request<void>('DELETE', `/providers/${id}`);
  }

  async getLogs(agentId: string, limit = 50): Promise<ApiResponse<AgentLog[]>> {
    return this.request<AgentLog[]>('GET', `/agents/${agentId}/logs?limit=${limit}`);
  }

  // --- Wallet (live devnet data) ---
  async getWalletBalance(agentId: string): Promise<ApiResponse<{
    sol: number;
    solLamports: number;
    tokens: Array<{ address: string; mint: string; balance: number; decimals: number; symbol?: string }>;
    pubkey: string;
  }>> {
    return this.request('GET', `/wallet/${agentId}/balance`);
  }

  async getWalletTransactions(agentId: string, limit = 20): Promise<ApiResponse<Array<{
    signature: string;
    blockTime: string | null;
    slot: number;
    status: string;
    err: any;
    memo: string | null;
  }>>> {
    return this.request('GET', `/wallet/${agentId}/transactions?limit=${limit}`);
  }

  async getTransactionDetail(agentId: string, signature: string): Promise<ApiResponse<{
    signature: string;
    slot: number;
    blockTime: string | null;
    fee: number;
    status: string;
    error: string | null;
    instructions: Array<{ programId: string; program: string | null; parsed: any }>;
    preBalances: number[];
    postBalances: number[];
    logMessages: string[] | null;
  }>> {
    return this.request('GET', `/wallet/${agentId}/transaction/${signature}`);
  }

  // --- Cron Jobs ---
  async getCronJobs(agentId: string): Promise<ApiResponse<any[]>> {
    return this.request('GET', `/cron/${agentId}`);
  }

  async createCronJob(agentId: string, name: string, expression: string, taskPrompt: string): Promise<ApiResponse<any>> {
    return this.request('POST', '/cron', { agentId, name, expression, taskPrompt });
  }

  async deleteCronJob(id: number): Promise<ApiResponse<void>> {
    return this.request<void>('DELETE', `/cron/${id}`);
  }

  async toggleCronJob(id: number, active: boolean): Promise<ApiResponse<any>> {
    return this.request('PATCH', `/cron/${id}`, { active });
  }
}
