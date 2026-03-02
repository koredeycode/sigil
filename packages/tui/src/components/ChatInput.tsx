import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useEffect, useState } from 'react';
import { useConfig } from '../context/ConfigContext.js';
import { Agent } from '../hooks/useAgents.js';
import { useSocket } from '../hooks/useSocket.js';
import { ApiClient } from '../lib/api.js';
// @ts-ignore
import md from 'cli-md';

interface ChatMessage {
    id: number | string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tools?: string | Array<{ tool: string; result: string }>;
}

export interface ChatInputProps {
  activeAgent: Agent | null;
  isFocused: boolean;
  onFocusChange?: (focused: boolean) => void;
}

export function ChatInput({ activeAgent, isFocused, onFocusChange }: ChatInputProps) {
  const { apiPort, authToken } = useConfig();
  const { socket } = useSocket();
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [dots, setDots] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!activeAgent) return;
    const fetchHistory = async () => {
        try {
            const client = new ApiClient(apiPort, authToken);
            const res = await client.getChats(activeAgent.id, 3);
            if (res && Array.isArray(res)) setMessages(res);
        } catch (e) {}
    };
    fetchHistory();
  }, [activeAgent, apiPort, authToken]);

  useEffect(() => {
    if (!sending) return;
    const timer = setInterval(() => {
      setDots((prev) => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(timer);
  }, [sending]);

  // WebSocket listener
  useEffect(() => {
    if (!socket || !activeAgent) return;

    const handleMessage = (data: any) => {
        if (data.agent === activeAgent.name) {
            setMessages(prev => {
                const exists = prev.some(m => m.id === data.timestamp || (m.role === data.role && m.content === data.content && Date.now() - Number(m.id) < 1000));
                if (exists && data.role === 'user') return prev;
                
                return [...prev, {
                    id: data.timestamp || Date.now(),
                    role: data.role,
                    content: data.content,
                    tools: data.tools
                }];
            });
            if (data.role === 'assistant') {
                setSending(false);
            }
        }
    };

    socket.on('chat:message', handleMessage);
    return () => {
        socket.off('chat:message', handleMessage);
    };
  }, [socket, activeAgent]);

  if (!activeAgent) return null;

  // Render up to last 20 messages for full-screen CLI
  const displayMsgs = messages.slice(-20);

  return (
    <Box flexDirection="column" gap={1}>
      {displayMsgs.length > 0 && (
          <Box flexDirection="column" paddingX={0}>
              {displayMsgs.map((msg, idx) => {
                  let parsedTools: any = null;
                  if (msg.tools && msg.role === 'assistant') {
                      try {
                          parsedTools = typeof msg.tools === 'string' ? JSON.parse(msg.tools) : msg.tools;
                      } catch (e) {}
                  }
                  
                  return (
                    <Box key={msg.id ?? idx} flexDirection="column" marginBottom={msg.role === 'assistant' ? 1 : 0}>
                        <Text>
                           {msg.role === 'user' ? <Text color="cyan">❯ </Text> : <Text color="magenta">✵ </Text>}
                           {msg.role === 'user' ? msg.content : ''}
                        </Text>
                        {msg.role !== 'user' && (
                           <Text>{md(msg.content).trimEnd()}</Text>
                        )}
                        {parsedTools && Array.isArray(parsedTools) && parsedTools.length > 0 && (
                           <Box flexDirection="column" paddingX={2} borderStyle="single" borderColor="gray" marginY={1}>
                               <Text color="gray">🛠️  Tools Executed:</Text>
                               {parsedTools.map((t: any, i: number) => (
                                   <Box key={i} flexDirection="column" marginTop={i > 0 ? 1 : 0}>
                                       <Text color="green">➜ {t.tool}</Text>
                                       <Text dimColor>{t.result.length > 200 ? t.result.substring(0, 200) + '...' : t.result}</Text>
                                   </Box>
                               ))}
                           </Box>
                        )}
                    </Box>
                  )
              })}
          </Box>
      )}

      {sending ? (
          <Box paddingX={0} marginTop={1}>
              <Text color="yellow">✵ {dots.padEnd(3, ' ')}</Text>
          </Box>
      ) : (
          <Box paddingX={0} marginTop={1}>
            <Text color="white" bold>❯ </Text>
            <TextInput
              value={query}
              onChange={setQuery}
              focus={isFocused}
              onSubmit={async (val) => {
                setQuery('');
                if (!val.trim()) return;
                
                if (socket) {
                    socket.emit('chat:message', { agentId: activeAgent.id, content: val.trim() });
                    setSending(true);
                }
              }}
              placeholder="Type a message... (q to quit)"
            />
          </Box>
      )}
    </Box>
  );
}
