import { useEffect, useState } from 'react';
import { ApiClient } from '../lib/api'; // Adjusted import path
import { useSocket } from './useSocket'; // Adjusted import path

// Agent interface matching Core
export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  role: string;
}

export function useAgents() {
  const { socket } = useSocket();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    const token = localStorage.getItem('sigil_token');
    if (!token) return;

    const client = new ApiClient(token); // Adjusted constructor
    client.getAgents().then((data) => {
      if (Array.isArray(data)) {
        setAgents(data);
        if (data.length > 0 && !activeAgentId) {
             setActiveAgentId(data[0].id);
        }
      }
    }).catch(console.error);
  }, []);

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

  return {
    agents,
    activeAgentId,
    setActiveAgentId,
    activeAgent: agents.find(a => a.id === activeAgentId) || null,
  };
}
