import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useEffect, useState } from 'react';
// @ts-ignore
import md from 'cli-md';

interface ChatMessage {
  id: number | string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools?: string | Array<{ tool: string; result: string }>;
}

interface ChatViewProps {
  messages?: ChatMessage[];
  sending?: boolean;
  query?: string;
  onQueryChange?: (val: string) => void;
  onSubmit?: (val: string) => void;
  isFocused?: boolean;
  inputOnly?: boolean;
}

export function ChatView({
  messages = [],
  sending = false,
  query = '',
  onQueryChange,
  onSubmit,
  isFocused = false,
  inputOnly = false,
}: ChatViewProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!sending) { setDots(''); return; }
    const timer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(timer);
  }, [sending]);

  // Input-only mode (used by Layout for the separated input area)
  if (inputOnly) {
    if (sending) {
      return (
        <Box>
          <Text color="magenta">  thinking{dots.padEnd(3, ' ')}</Text>
        </Box>
      );
    }
    return (
      <Box>
        <Text bold color="white">&gt; </Text>
        <TextInput
          value={query}
          onChange={onQueryChange || (() => {})}
          focus={isFocused}
          onSubmit={(val) => {
            onQueryChange?.('');
            onSubmit?.(val);
          }}
          placeholder="Type a message..."
        />
      </Box>
    );
  }

  // Messages rendering mode
  return (
    <Box flexDirection="column" gap={0}>
      {messages.map((msg, idx) => {
        // System messages (log events) — dimmed inline
        if (msg.role === 'system') {
          return (
            <Box key={String(msg.id) ?? idx} paddingLeft={2}>
              <Text dimColor>{msg.content}</Text>
            </Box>
          );
        }

        // User messages — highlighted with inverse/background
        if (msg.role === 'user') {
          return (
            <Box key={String(msg.id) ?? idx} marginTop={idx > 0 ? 1 : 0}>
              <Text bold color="cyan">&gt; </Text>
              <Text bold inverse> {msg.content} </Text>
            </Box>
          );
        }

        // Assistant messages
        let parsedTools: any[] | null = null;
        if (msg.tools) {
          try {
            parsedTools = typeof msg.tools === 'string' ? JSON.parse(msg.tools) : msg.tools;
          } catch {}
        }

        return (
          <Box key={String(msg.id) ?? idx} flexDirection="column" marginTop={1}>
            <Box>
              <Text color="magenta">{'● '}</Text>
              <Text> {md(msg.content).trimEnd()}</Text>
            </Box>
            {parsedTools && Array.isArray(parsedTools) && parsedTools.length > 0 && (
              <Box flexDirection="column" paddingLeft={4} marginTop={0}>
                {parsedTools.map((t: any, i: number) => (
                  <Text key={i} dimColor>
                    [tool] {t.tool}{t.result ? `: ${t.result.length > 120 ? t.result.substring(0, 120) + '...' : t.result}` : ''}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
