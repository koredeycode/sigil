import { useEffect, useState } from 'react';
import { useConfig } from '../context/ConfigContext.js';
import { ApiClient } from '../lib/api.js';
import { useSocket } from './useSocket.js';

// Agent interface matching Core
export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
}

export function useAgents() {
  const { apiPort, authToken } = useConfig();
  const { socket } = useSocket();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Initial fetch
  useEffect(() => {
    if (!authToken) return;
    const client = new ApiClient(apiPort, authToken);
    client.getAgents().then((data) => {
      // adapt data if needed (if API returns object wrapper)
      // Assuming API returns array for now based on typical patterns
      if (Array.isArray(data)) {
        setAgents(data);
      }
    }).catch(console.error);
  }, [apiPort, authToken]);

  // Socket updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (updatedAgent: Agent) => {
        setAgents((prev) => {
            const index = prev.findIndex(a => a.id === updatedAgent.id);
            if (index >= 0) {
                const newAgents = [...prev];
                newAgents[index] = updatedAgent;
                return newAgents;
            }
            return [...prev, updatedAgent];
        });
    };

    socket.on('agent:created', handleUpdate);
    socket.on('agent:updated', handleUpdate);
    socket.on('agent:status', handleUpdate);

    return () => {
        socket.off('agent:created', handleUpdate);
        socket.off('agent:updated', handleUpdate);
        socket.off('agent:status', handleUpdate);
    };
  }, [socket]);

  const activeAgent = agents[activeIndex] || null;

  const nextAgent = () => {
    if (agents.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % agents.length);
  };

  const prevAgent = () => {
    if (agents.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + agents.length) % agents.length);
  };

  return {
    agents,
    activeAgent,
    nextAgent,
    prevAgent,
  };
}
