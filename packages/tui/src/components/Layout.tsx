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

// ── Outer Shell: handles splash + delegates to inner view ──────────────────

export function Layout() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  if (showSplash) {
    return <Splash onDone={handleSplashDone} />;
  }

  return <LayoutInner />;
}

// ── Inner Layout: all the real work ────────────────────────────────────────

function LayoutInner() {
  const { agents, activeAgent, nextAgent } = useAgents();
  const { exit } = useApp();
  const { apiPort, authToken } = useConfig();
  const { socket, connected } = useSocket();
  const { stdout } = useStdout();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  // Bump this to force a full remount of the view (clears Static items)
  const [viewKey, setViewKey] = useState(0);

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

  // Keyboard shortcuts
  useInput((input, key) => {
    if (input === 'c' && key.ctrl) { exit(); return; }
    if (key.tab && !key.shift) {
      process.stdout.write('\x1B[2J\x1B[H');
      setViewMode(prev => prev === 'chat' ? 'logs' : 'chat');
      setViewKey(k => k + 1);
      return;
    }
    if (key.tab && key.shift) {
      process.stdout.write('\x1B[2J\x1B[H');
      nextAgent();
      prevAgentRef.current = null;
      setMessages([]);
      setViewKey(k => k + 1);
      return;
    }
  });

  if (!activeAgent) {
    return (
      <Box padding={1}>
        <Text dimColor>Waiting for agents to initialize...</Text>
      </Box>
    );
  }

  const agentIndex = agents.findIndex(a => a.id === activeAgent.id);
  const statusColor = activeAgent.status === 'running' ? 'green' : 'yellow';

  /*
   * The entire view below uses a `key` that changes on agent/view switch.
   * This forces React to unmount and remount, which:
   * 1. Clears Static's internal item list (starts fresh)
   * 2. Combined with clearScreen(), gives a clean slate
   *
   * During normal typing, nothing here changes, so Static items are untouched
   * and only the tiny dynamic area (input + status) re-renders.
   */

  return (
    <Box key={viewKey} flexDirection="column" width="100%">
      {/* Messages via Static — each rendered once, never re-rendered */}
      {viewMode === 'chat' && (
        <Static items={messages}>
          {(msg) => <ChatView key={String(msg.id)} singleMessage={msg} />}
        </Static>
      )}

      {/* Logs view */}
      {viewMode === 'logs' && (
        <LogsView
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
        <Text color={statusColor}>●</Text>
        <Text dimColor> {activeAgent.status}</Text>
        {agents.length > 1 && (
          <>
            <Text dimColor> ·</Text>
            <Text dimColor> {agentIndex + 1}/{agents.length}</Text>
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
          <Text color="cyan" bold>Tab</Text>
          <Text dimColor>: {viewMode === 'chat' ? 'logs' : 'chat'}</Text>
          {agents.length > 1 && (
            <>
              <Text dimColor>  |  </Text>
              <Text color="cyan" bold>Shift+Tab</Text>
              <Text dimColor>: switch agent</Text>
            </>
          )}
          <Text dimColor>  |  </Text>
          <Text color="red" bold>Ctrl+C</Text>
          <Text dimColor>: exit</Text>
        </Box>
        {provider && <Text dimColor>{provider.name}</Text>}
      </Box>
    </Box>
  );
}
