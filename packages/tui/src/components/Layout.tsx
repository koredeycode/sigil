import { Box, Static, Text, useApp, useInput, useStdout } from 'ink';
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
  const { agents, activeAgent, nextAgent } = useAgents();
  const { exit } = useApp();
  const { apiPort, authToken } = useConfig();
  const { socket, connected } = useSocket();
  const { stdout } = useStdout();

  const [showSplash, setShowSplash] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [logsKey, setLogsKey] = useState(0);

  const termWidth = stdout?.columns ?? 80;
  const prevAgentRef = useRef<string | null>(null);

  const hLine = useMemo(() => '─'.repeat(Math.max(1, termWidth - 4)), [termWidth]);

  // Fetch primary provider info (once)
  useEffect(() => {
    if (!authToken) return;
    const client = new ApiClient(apiPort, authToken);
    client.getProviders().then(providers => {
      const primary = providers.find((p: any) => p.is_primary);
      if (primary) setProvider({ name: primary.name, model: primary.model });
      else if (providers.length > 0) setProvider({ name: providers[0].name, model: providers[0].model });
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

  // Socket listeners
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

    const addSystem = (prefix: string, content: string, agent: string) => {
      if (agent !== activeAgent.id && agent !== activeAgent.name) return;
      setMessages(prev => [...prev, {
        id: `${prefix}-${Date.now()}`,
        role: 'system' as const,
        content: `[${prefix}] ${content}`,
      }].slice(-100));
    };

    const onThought = (d: any) => addSystem('thought', d.thought, d.agent);
    const onAction = (d: any) => addSystem('action', d.tool, d.agent);
    const onError = (d: any) => addSystem('error', d.error, d.agent);
    const onTx = (d: any) => addSystem('tx', `${d.type || 'transaction'} ${d.amount || ''} ${d.token || ''}`.trim(), d.agent);

    socket.on('chat:message', handleMessage);
    socket.on('agent:thought', onThought);
    socket.on('agent:action', onAction);
    socket.on('agent:error', onError);
    socket.on('agent:transaction', onTx);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('agent:thought', onThought);
      socket.off('agent:action', onAction);
      socket.off('agent:error', onError);
      socket.off('agent:transaction', onTx);
    };
  }, [socket, activeAgent]);

  const handleSubmit = useCallback((val: string) => {
    if (!val.trim() || !socket || !activeAgent) return;
    socket.emit('chat:message', { agentId: activeAgent.id, content: val.trim() });
    setSending(true);
  }, [socket, activeAgent]);

  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  // Keyboard shortcuts — only fires on modifier keys, not regular typing
  useInput((input, key) => {
    if (input === 'c' && key.ctrl) { exit(); return; }
    if (key.tab && !key.shift) {
      setViewMode(prev => prev === 'chat' ? 'logs' : 'chat');
      return;
    }
    if (key.tab && key.shift) {
      nextAgent();
      prevAgentRef.current = null;
      setMessages([]);
      setLogsKey(k => k + 1);
      return;
    }
  });

  if (showSplash) {
    return <Splash onDone={handleSplashDone} />;
  }

  if (!activeAgent) {
    return (
      <Box padding={1}>
        <Text dimColor>Waiting for agents to initialize...</Text>
      </Box>
    );
  }

  const agentIndex = agents.findIndex(a => a.id === activeAgent.id);

  /*
   * Use Ink's <Static> for message history.
   * Static renders items ONCE and never re-renders them — they stay on screen
   * permanently, like real terminal output. This completely eliminates flicker
   * for messages because Ink doesn't touch them.
   *
   * Only the area BELOW <Static> (input, status bar) is dynamic and re-rendered.
   */

  return (
    <Box flexDirection="column" width="100%">
      {/* Static message history — rendered ONCE per message, never re-rendered */}
      {viewMode === 'chat' && (
        <Static items={messages}>
          {(msg) => <ChatView key={String(msg.id)} singleMessage={msg} />}
        </Static>
      )}

      {/* Logs view (not static — it needs to scroll/update) */}
      {viewMode === 'logs' && (
        <LogsView
          key={logsKey}
          agentId={activeAgent.id}
          agentName={activeAgent.name}
          maxLines={30}
        />
      )}

      {/* Info Bar */}
      <Box paddingX={2} gap={2} marginTop={1}>
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
            <Text dimColor>{agentIndex + 1}/{agents.length}</Text>
          </>
        )}
      </Box>

      {/* Divider + Input (chat view only) */}
      {viewMode === 'chat' && (
        <>
          <Box paddingX={2}>
            <Text dimColor>{hLine}</Text>
          </Box>
          <Box paddingX={2} paddingY={0}>
            <ChatView onSubmit={handleSubmit} isFocused={true} sending={sending} inputOnly />
          </Box>
        </>
      )}

      {/* Bottom divider + Status bar */}
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
        {provider && <Text dimColor>{provider.name}</Text>}
      </Box>
    </Box>
  );
}
