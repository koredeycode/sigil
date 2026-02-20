import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import { Agent } from '../hooks/useAgents.js';
import { useSocket } from '../hooks/useSocket.js';

interface LogStreamProps {
  activeAgent: Agent | null;
}

interface LogEntry {
  type: 'info' | 'thought' | 'action' | 'error';
  content: string;
  timestamp: string;
}

export function LogStream({ activeAgent }: LogStreamProps) {
  const { socket } = useSocket();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!socket || !activeAgent) return;

    const handleThought = (data: any) => {
      const entry: LogEntry = { type: 'thought', content: data.thought, timestamp: new Date().toISOString() };
      setLogs(prev => [...prev, entry].slice(-10));
    };

    const handleAction = (data: any) => {
      const entry: LogEntry = { type: 'action', content: `${data.tool}: ${JSON.stringify(data.params)}`, timestamp: new Date().toISOString() };
      setLogs(prev => [...prev, entry].slice(-10));
    };
    
    // Listen to agent-specific events if namespaces work, or filter global events?
    // Socket setup in Core emits to /agent/<id> AND global.
    // Client connects to default namespace usually.
    // If we want agent specific, we check data.agent === activeAgent.id?
    // Core emits: agentIdentifier in data?
    // Let's assume global listener for now and filter.
    
    const filterAndAdd = (type: LogEntry['type'], content: string, agentId?: string) => {
        if (agentId && agentId !== activeAgent.id) return;
        const entry: LogEntry = { type, content, timestamp: new Date().toISOString() };
        setLogs(prev => [...prev, entry].slice(-10));
    };

    socket.on('agent:thought', (d) => filterAndAdd('thought', d.thought, d.agent));
    socket.on('agent:action', (d) => filterAndAdd('action', `${d.tool}`, d.agent));
    
    return () => {
      socket.off('agent:thought');
      socket.off('agent:action');
    };
  }, [socket, activeAgent]);

  if (!activeAgent) return <Box><Text>No agent selected</Text></Box>;

  return (
    <Box borderStyle="round" borderColor="gray" flexDirection="column" flexGrow={1} paddingX={1}>
      <Text dimColor>--- Log Stream: {activeAgent.name} ---</Text>
      {logs.length === 0 && <Text dimColor>Waiting for activity...</Text>}
      {logs.map((log, i) => (
        <Text key={i} color={log.type === 'thought' ? 'yellow' : log.type === 'action' ? 'blue' : 'white'}>
          [{log.type.toUpperCase()}] {log.content}
        </Text>
      ))}
    </Box>
  );
}
