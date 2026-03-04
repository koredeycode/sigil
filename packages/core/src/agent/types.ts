import { EventEmitter } from 'events';

export interface AgentRow {
  id: string;
  name: string;
  pubkey: string;
  status: 'running' | 'paused';
  loop_interval: number;
  prompt: string | null;
  created_at: string;
}

export interface IAgentManager extends EventEmitter {
  getMainAgent(): AgentRow | undefined;
  emit(event: string, ...args: any[]): boolean;
}
