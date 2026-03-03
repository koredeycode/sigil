import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useConfig } from '../context/ConfigContext.js';
import { useAgents } from '../hooks/useAgents.js';
import { useSocket } from '../hooks/useSocket.js';
import { ApiClient } from '../lib/api.js';
import { ChatView } from './ChatView.js';
import { LogsView } from './LogsView.js';
import { Splash } from './Splash.js';

type ViewMode = 'chat' | 'logs';

interface ChatMessage {
  id: number | string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools?: string | Array<{ tool: string; result: string }>;
}

interface ProviderInfo {
  name: string;
  model: string;
}

export function Layout() {
  const { agents, activeAgent, nextAgent, prevAgent } = useAgents();
  const { exit } = useApp();
  const { apiPort, authToken } = useConfig();
  const { socket, connected } = useSocket();
  const { stdout } = useStdout();

  const [showSplash, setShowSplash] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [logsKey, setLogsKey] = useState(0); // key to force LogsView remount on agent switch

  const termWidth = stdout?.columns ?? 80;
  const termHeight = stdout?.rows ?? 24;
  const prevAgentRef = useRef<string | null>(null);

  // Horizontal line helper
  const hLine = useMemo(() => '─'.repeat(Math.max(1, termWidth - 4)), [termWidth]);

  // Fetch primary provider info
  useEffect(() => {
    if (!authToken) return;
    const client = new ApiClient(apiPort, authToken);
    client.getProviders().then(providers => {
      const primary = providers.find((p: any) => p.is_primary);
      if (primary) {
        setProvider({ name: primary.name, model: primary.model });
      } else if (providers.length > 0) {
        setProvider({ name: providers[0].name, model: providers[0].model });
      }
    }).catch(() => {});
  }, [apiPort, authToken]);

  // Fetch chat history when agent changes
  useEffect(() => {
    if (!activeAgent) return;

    if (prevAgentRef.current === activeAgent.id) return;
    prevAgentRef.current = activeAgent.id;

    const client = new ApiClient(apiPort, authToken);
    client.getChats(activeAgent.id, 30).then(res => {
      if (Array.isArray(res)) setMessages(res);
    }).catch(() => {});
  }, [activeAgent, apiPort, authToken]);

  // Socket listeners for chat messages and log events
  useEffect(() => {
    if (!socket || !activeAgent) return;

    const handleMessage = (data: any) => {
      if (data.agent === activeAgent.name) {
        setMessages(prev => {
          const exists = prev.some(
            m => m.id === data.timestamp ||
              (m.role === data.role && m.content === data.content && Date.now() - Number(m.id) < 1000)
          );
          if (exists && data.role === 'user') return prev;
          return [...prev, {
            id: data.timestamp || Date.now(),
            role: data.role,
            content: data.content,
            tools: data.tools,
          }].slice(-100);
        });
        if (data.role === 'assistant') setSending(false);
      }
    };

    // Log events as system messages in chat
    const handleThought = (d: any) => {
      if (d.agent !== activeAgent.id && d.agent !== activeAgent.name) return;
      setMessages(prev => [...prev, {
        id: `thought-${Date.now()}`,
        role: 'system' as const,
        content: `[thought] ${d.thought}`,
      }].slice(-100));
    };

    const handleAction = (d: any) => {
      if (d.agent !== activeAgent.id && d.agent !== activeAgent.name) return;
      setMessages(prev => [...prev, {
        id: `action-${Date.now()}`,
        role: 'system' as const,
        content: `[action] ${d.tool}`,
      }].slice(-100));
    };

    const handleError = (d: any) => {
      if (d.agent !== activeAgent.id && d.agent !== activeAgent.name) return;
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system' as const,
        content: `[error] ${d.error}`,
      }].slice(-100));
    };

    const handleTx = (d: any) => {
      if (d.agent !== activeAgent.id && d.agent !== activeAgent.name) return;
      setMessages(prev => [...prev, {
        id: `tx-${Date.now()}`,
        role: 'system' as const,
        content: `[tx] ${d.type || 'transaction'} ${d.amount || ''} ${d.token || ''}`.trim(),
      }].slice(-100));
    };

    socket.on('chat:message', handleMessage);
    socket.on('agent:thought', handleThought);
    socket.on('agent:action', handleAction);
    socket.on('agent:error', handleError);
    socket.on('agent:transaction', handleTx);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('agent:thought', handleThought);
      socket.off('agent:action', handleAction);
      socket.off('agent:error', handleError);
      socket.off('agent:transaction', handleTx);
    };
  }, [socket, activeAgent]);

  // Switch agent helper — clears state
  const switchAgent = useCallback((direction: 'next' | 'prev') => {
    if (direction === 'next') nextAgent();
    else prevAgent();
    // Clear everything so the new agent starts fresh
    prevAgentRef.current = null;
    setMessages([]);
    setLogsKey(k => k + 1); // Force LogsView remount
  }, [nextAgent, prevAgent]);

  // Keyboard handling — NO arrow keys (they conflict with cursor in text input)
  useInput((input, key) => {
    if (input === 'c' && key.ctrl) {
      exit();
      return;
    }
    // Tab = switch view mode (chat <-> logs)
    if (key.tab && !key.shift) {
      setViewMode(prev => prev === 'chat' ? 'logs' : 'chat');
      return;
    }
    // Shift+Tab = switch agent
    if (key.tab && key.shift) {
      switchAgent('next');
      return;
    }
  });

  const handleSubmit = useCallback((val: string) => {
    if (!val.trim() || !socket || !activeAgent) return;
    socket.emit('chat:message', { agentId: activeAgent.id, content: val.trim() });
    setSending(true);
  }, [socket, activeAgent]);

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }

  if (!activeAgent) {
    return (
      <Box padding={1}>
        <Text dimColor>Waiting for agents to initialize...</Text>
      </Box>
    );
  }

  // Calculate visible messages based on terminal height
  // Reserve lines for: info (2) + dividers (2) + input (1) + status bar (2) + tab indicator (1)
  const maxVisible = Math.max(8, termHeight - 12);
  const visibleMessages = messages.slice(-maxVisible);

  return (
    <Box flexDirection="column" width="100%">
      {/* Content Area */}
      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
        {viewMode === 'chat' ? (
          <ChatView
            messages={visibleMessages}
            sending={sending}
          />
        ) : (
          <LogsView
            key={logsKey}
            agentId={activeAgent.id}
            agentName={activeAgent.name}
            maxLines={maxVisible}
          />
        )}
      </Box>

      {/* View Tabs + Agent Info (below content) */}
      <Box paddingX={2} gap={2}>
        <Text bold={viewMode === 'chat'} color={viewMode === 'chat' ? 'white' : 'gray'}>
          {viewMode === 'chat' ? '[Chat]' : ' Chat '}
        </Text>
        <Text bold={viewMode === 'logs'} color={viewMode === 'logs' ? 'white' : 'gray'}>
          {viewMode === 'logs' ? '[Logs]' : ' Logs '}
        </Text>
        <Box flexGrow={1} />
        <Text bold color="magenta">{activeAgent.name}</Text>
        {provider && (
          <>
            <Text dimColor>·</Text>
            <Text dimColor>{provider.model}</Text>
          </>
        )}
        <Text dimColor>·</Text>
        <Text dimColor>{connected ? '●' : '○'} {activeAgent.status}</Text>
        {agents.length > 1 && (
          <>
            <Text dimColor>·</Text>
            <Text dimColor>{agents.findIndex(a => a.id === activeAgent.id) + 1}/{agents.length}</Text>
          </>
        )}
      </Box>

      {/* Horizontal divider */}
      <Box paddingX={2}>
        <Text dimColor>{hLine}</Text>
      </Box>

      {/* Input */}
      <Box paddingX={2} paddingY={0}>
        <ChatView
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleSubmit}
          isFocused={viewMode === 'chat'}
          sending={sending}
          inputOnly
        />
      </Box>

      {/* Bottom divider + Status Bar */}
      <Box paddingX={2}>
        <Text dimColor>{hLine}</Text>
      </Box>
      <Box paddingX={2}>
        <Box flexGrow={1}>
          <Text dimColor>
            Tab: {viewMode === 'chat' ? 'logs' : 'chat'}
            {agents.length > 1 ? '  |  Shift+Tab: switch agent' : ''}
            {'  |  Ctrl+C: exit'}
          </Text>
        </Box>
        {provider && (
          <Text dimColor>{provider.name}</Text>
        )}
      </Box>
    </Box>
  );
}
