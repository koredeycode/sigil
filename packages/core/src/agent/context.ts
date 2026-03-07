import type { IAgentManager } from './types.js';

let agentManager: IAgentManager | null = null;

export function setAgentManager(manager: IAgentManager): void {
  agentManager = manager;
}

export function getAgentManager(): IAgentManager | null {
  return agentManager;
}

export function emitAgentEvent(event: string, ...args: any[]): void {
  if (agentManager) {
    agentManager.emit(event, ...args);
  }
}
