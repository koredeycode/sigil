import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import { useConfig } from '../context/ConfigContext.js';
import { useSocket } from '../hooks/useSocket.js';
import { ApiClient } from '../lib/api.js';

interface LogEntry {
  id: string;
  type: 'thought' | 'action' | 'transaction' | 'error' | 'info';
  content: string;
  timestamp: string;
}

interface LogsViewProps {
  agentId: string;
  agentName: string;
  maxLines?: number;
}

export function LogsView({ agentId, agentName, maxLines = 50 }: LogsViewProps) {
  const { socket } = useSocket();
  const { apiPort, authToken } = useConfig();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Fetch historical logs on mount / agent change
  useEffect(() => {
    let cancelled = false;
    setLogs([]); // Clear on agent change

    const client = new ApiClient(apiPort, authToken);
    client.getLogs(agentId, 30).then(res => {
      if (cancelled) return;
      if (Array.isArray(res)) {
        const mapped = res.reverse().map((l: any) => ({
          id: l.id?.toString() || `hist-${Math.random()}`,
          type: mapActionToType(l.action),
          content: [l.action, l.result, l.thought].filter(Boolean).join(' — '),
          timestamp: l.timestamp || '',
        }));
        setLogs(mapped);
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [agentId, apiPort, authToken]);

  // Live log streaming via socket — matches actual core events
  useEffect(() => {
    if (!socket) return;

    const addLog = (type: LogEntry['type'], content: string, agent?: string) => {
      if (agent && agent !== agentId && agent !== agentName) return;
      setLogs(prev => [...prev, {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        content,
        timestamp: new Date().toISOString(),
      }].slice(-maxLines));
    };

    // Core emits: agent:thought { agent, thought, timestamp }
    const onThought = (d: any) => addLog('thought', d.thought, d.agent);

    // Core emits: agent:action { agent, tool, result, timestamp }
    const onAction = (d: any) => addLog('action', `${d.tool}${d.result ? ': ' + (d.result.length > 100 ? d.result.slice(0, 100) + '...' : d.result) : ''}`, d.agent);

    // Core emits: agent:error { agent, error, timestamp }
    const onError = (d: any) => addLog('error', d.error, d.agent);

    // Core emits: agent:transaction { agent, type, amount, token, ... }
    const onTx = (d: any) => addLog('transaction', `${d.type || 'tx'} ${d.amount || ''} ${d.token || ''} ${d.signature ? '(' + d.signature.slice(0, 8) + '...)' : ''}`.trim(), d.agent);

    socket.on('agent:thought', onThought);
    socket.on('agent:action', onAction);
    socket.on('agent:error', onError);
    socket.on('agent:transaction', onTx);

    return () => {
      socket.off('agent:thought', onThought);
      socket.off('agent:action', onAction);
      socket.off('agent:error', onError);
      socket.off('agent:transaction', onTx);
    };
  }, [socket, agentId, agentName, maxLines]);

  const typeColor = (type: LogEntry['type']): string => {
    switch (type) {
      case 'thought': return 'yellow';
      case 'action': return 'blue';
      case 'transaction': return 'green';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const typeLabel = (type: LogEntry['type']): string => {
    switch (type) {
      case 'thought': return 'THOUGHT';
      case 'action': return 'ACTION ';
      case 'transaction': return 'TX     ';
      case 'error': return 'ERROR  ';
      default: return 'INFO   ';
    }
  };

  return (
    <Box flexDirection="column" gap={0}>
      {logs.length === 0 && (
        <Text dimColor>  Waiting for activity...</Text>
      )}
      {logs.map((log) => {
        const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '';
        return (
          <Box key={log.id} gap={1}>
            <Text dimColor>{time}</Text>
            <Text color={typeColor(log.type)} bold>{typeLabel(log.type)}</Text>
            <Text dimColor>{log.content.length > 200 ? log.content.slice(0, 200) + '...' : log.content}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Map DB log `action` field to a display type.
 */
function mapActionToType(action: string): LogEntry['type'] {
  if (!action) return 'info';
  const a = action.toLowerCase();
  if (a.includes('error')) return 'error';
  if (a.includes('invoke') || a.includes('cron') || a.includes('cycle')) return 'action';
  if (a.includes('token') || a.includes('usage')) return 'info';
  return 'thought';
}
