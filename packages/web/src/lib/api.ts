import axios from 'axios';

export class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string, port: number = 7445) {
    this.baseUrl = `http://localhost:${port}/api`;
    this.token = token;
  }

  private async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
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
      return response.data;
    } catch (error: any) {
      console.error(`API Error ${method} ${endpoint}:`, error.message);
      throw error;
    }
  }

  async getAgents() {
    return this.request<any[]>('GET', '/agents');
  }

  async getAgent(id: string) {
    return this.request<any>('GET', `/agents/${id}`);
  }

  async createAgent(name: string, role: string) {
    return this.request<any>('POST', '/agents', { name, role });
  }

  async sendChat(agentId: string, message: string) {
    return this.request<any>('POST', '/chat', { agentId, message });
  }

  async getTransactions(agentId: string) {
    return this.request<any[]>('GET', `/agents/${agentId}/transactions`);
  }
}
