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

// ── Single Message Renderer (used by Static) ───────────────────────────────

function renderMessage(msg: ChatMessage) {
  // System messages (log events)
  if (msg.role === 'system') {
    return (
      <Box paddingLeft={2} marginTop={1}>
        <Text dimColor>{msg.content}</Text>
      </Box>
    );
  }

  // User messages — highlighted
  if (msg.role === 'user') {
    return (
      <Box marginTop={1}>
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
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="magenta">{'● '}</Text>
        <Text> {md(msg.content).trimEnd()}</Text>
      </Box>
      {parsedTools && Array.isArray(parsedTools) && parsedTools.length > 0 && (
        <Box flexDirection="column" paddingLeft={4}>
          {parsedTools.map((t: any, i: number) => (
            <Text key={i} dimColor>
              [tool] {t.tool}{t.result ? `: ${t.result.length > 120 ? t.result.substring(0, 120) + '...' : t.result}` : ''}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Chat Input (self-contained state) ──────────────────────────────────────

function ChatInput({ onSubmit, isFocused, sending }: {
  onSubmit: (val: string) => void;
  isFocused: boolean;
  sending: boolean;
}) {
  const [query, setQuery] = useState('');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!sending) { setDots(''); return; }
    const timer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(timer);
  }, [sending]);

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
        onChange={setQuery}
        focus={isFocused}
        onSubmit={(val) => {
          setQuery('');
          onSubmit(val);
        }}
        placeholder="Type a message..."
      />
    </Box>
  );
}

// ── Public ChatView ────────────────────────────────────────────────────────

interface ChatViewProps {
  // Single message mode (for use with <Static>)
  singleMessage?: ChatMessage;
  // Input-only mode
  onSubmit?: (val: string) => void;
  isFocused?: boolean;
  sending?: boolean;
  inputOnly?: boolean;
}

export function ChatView({
  singleMessage,
  onSubmit,
  isFocused = false,
  sending = false,
  inputOnly = false,
}: ChatViewProps) {
  // Input mode
  if (inputOnly) {
    return <ChatInput onSubmit={onSubmit || (() => {})} isFocused={isFocused} sending={sending} />;
  }

  // Single message mode (for <Static>)
  if (singleMessage) {
    return renderMessage(singleMessage);
  }

  return null;
}
