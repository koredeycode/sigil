import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useEffect, useState } from 'react';
import { useConfig } from '../context/ConfigContext.js';
import { Agent } from '../hooks/useAgents.js';
import { ApiClient } from '../lib/api.js';
// @ts-ignore
import md from 'cli-md';

interface ChatMessage {
    id: number | string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatInputProps {
  activeAgent: Agent | null;
  isFocused: boolean;
  onFocusChange?: (focused: boolean) => void;
}

export function ChatInput({ activeAgent, isFocused, onFocusChange }: ChatInputProps) {
  const { apiPort, authToken } = useConfig();
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

  if (!activeAgent) return null;

  // Render only last 3 messages for space
  const displayMsgs = messages.slice(-3);

  return (
    <Box flexDirection="column">
      {displayMsgs.length > 0 && (
          <Box flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" paddingX={1}>
              {displayMsgs.map((msg, idx) => {
                  return (
                    <Box key={msg.id ?? idx} flexDirection="column" marginBottom={msg.role === 'assistant' ? 1 : 0}>
                        <Text>
                           {msg.role === 'user' ? <Text color="cyan">You: </Text> : <Text color="magenta">{activeAgent.name}: </Text>}
                           {msg.role === 'user' ? msg.content : ''}
                        </Text>
                        {msg.role !== 'user' && (
                           <Text>{md(msg.content).trimEnd()}</Text>
                        )}
                    </Box>
                  )
              })}
          </Box>
      )}

      {sending ? (
          <Box borderStyle="round" borderColor="yellow" paddingX={1}>
              <Text color="yellow">{activeAgent.name} is typing{dots.padEnd(3, ' ')}</Text>
          </Box>
      ) : (
          <Box borderStyle="round" borderColor="magenta" paddingX={1}>
            <Text color="magenta">{activeAgent.name} ➜ </Text>
            <TextInput
              value={query}
              onChange={setQuery}
              focus={isFocused}
              onSubmit={async (val) => {
                setQuery('');
                if (!val.trim()) return;
                
                const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: val.trim() };
                setMessages(prev => [...prev, userMsg]);
                setSending(true);
                
                try {
                   const client = new ApiClient(apiPort, authToken);
                   const res: any = await client.sendChat(activeAgent.id, val);
                   const assistMsg: ChatMessage = { id: Date.now() + 1, role: 'assistant', content: res.response || 'Done.' };
                   setMessages(prev => [...prev, assistMsg]);
                } catch (e) {
                   setMessages(prev => [...prev, { id: Date.now() + 2, role: 'system', content: 'Error' }]);
                } finally {
                   setSending(false);
                }
              }}
              placeholder={`Message ${activeAgent.name}...`}
            />
          </Box>
      )}
    </Box>
  );
}
