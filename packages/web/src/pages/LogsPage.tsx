import { clsx } from 'clsx';
import { AlertCircle, RefreshCw, Terminal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CustomSelect } from '../components/CustomSelect';
import type { Agent } from '../hooks/useAgents';
import { useSocket } from '../hooks/useSocket';
import { ApiClient } from '../lib/api';

export function LogsPage({ agents }: { agents: Agent[] }) {
    const [searchParams] = useSearchParams();
    const agentIdParam = searchParams.get('agent');
    const navigate = useNavigate();

    // Auto-select main agent if no param
    const activeAgent = agents.find(a => a.id === agentIdParam)
        || agents.find(a => a.name === 'sigil')
        || agents[0]
        || null;

    const { socket } = useSocket();
    const endRef = useRef<HTMLDivElement>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logFilter, setLogFilter] = useState<string>('all');

    const fetchLogs = async () => {
        if (!activeAgent) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setIsLoading(true);
        setError(null);
        setHasMore(true);
        try {
            const client = new ApiClient(token);
            const res = await client.getLogs(activeAgent.id, 100);
            const data = res.data ? res.data.reverse() : [];
            setLogs(data);
            setHasMore(data.length >= 100);
        } catch (err: any) {
            console.error('Failed to fetch logs:', err);
            setError(err.error || err.message || 'Failed to fetch logs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [activeAgent?.id]);

    // Scroll-to-top: load older logs
    const handleScrollUp = async () => {
        const el = logContainerRef.current;
        if (!el || !activeAgent || loadingMore || !hasMore) return;
        if (el.scrollTop < 60) {
            setLoadingMore(true);
            const oldestId = logs.length > 0 ? Number(logs[0].id) : undefined;
            const token = localStorage.getItem('sigil_token');
            if (!token) { setLoadingMore(false); return; }
            try {
                const client = new ApiClient(token);
                const res = await client.getLogs(activeAgent.id, 50, oldestId);
                const older = res.data ? res.data.reverse() : [];
                if (older.length === 0) { setHasMore(false); }
                else {
                    const prevHeight = el.scrollHeight;
                    setLogs(prev => [...older, ...prev]);
                    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prevHeight; });
                    if (older.length < 50) setHasMore(false);
                }
            } catch (e) { console.error('Failed to load older logs:', e); }
            finally { setLoadingMore(false); }
        }
    };

    useEffect(() => {
        if (!socket || !activeAgent) return;

        const handleLog = (data: Record<string, any>) => {
            // Note: Background emits `agent: string (name)` not ID conventionally.
            if (data.agent === activeAgent.name || data.agentId === activeAgent.id) {
                setLogs(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    action: data.type === 'thought' ? 'agent_invoke' :
                            data.type === 'action' ? `tool:${data.tool?.name || data.toolName || 'unknown'}` :
                            data.type === 'error' ? 'agent_error' : 'info',
                    result: data.content || data.result || '',
                    thought: data.type === 'thought' ? (data.content || data.thought) : null,
                    timestamp: data.timestamp || new Date().toISOString()
                }]);
                
                // Optional: Scroll to bottom slightly after state settles
                setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        };

        socket.on('agent:thought', (data) => handleLog({ ...data, type: 'thought' }));
        socket.on('agent:action', (data) => handleLog({ ...data, type: 'action' }));
        socket.on('agent:error', (data) => handleLog({ ...data, type: 'error' }));

        return () => {
            socket.off('agent:thought');
            socket.off('agent:action');
            socket.off('agent:error');
        };
    }, [socket, activeAgent]);

    const handleSelectAgent = (id: string) => {
        navigate(`/logs?agent=${id}`);
    };

    return (
        <div className="flex flex-col h-full space-y-6 overflow-hidden">
            <header className="flex flex-col space-y-2 shrink-0 pr-2">
                <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
                <p className="text-muted-foreground">Historical execution details, thoughts, and errors.</p>
            </header>

            {/* Agent Selector */}
            <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 shrink-0 shadow-sm mr-2">
                <div className="flex-1 max-w-sm">
                    <CustomSelect
                        label="Target Agent"
                        value={activeAgent?.id || ''}
                        onChange={handleSelectAgent}
                        options={agents.map(a => ({ id: a.id, label: a.name }))}
                    />
                </div>

                <div className="flex-1 max-w-xs">
                    <CustomSelect
                        label="Filter"
                        value={logFilter}
                        onChange={setLogFilter}
                        options={[
                            { id: 'all', label: 'All Actions' },
                            { id: 'agent_invoke', label: 'Invoke / Thought' },
                            { id: 'tool', label: 'Tool Execution' },
                            { id: 'token_usage', label: 'Token Usage' },
                            { id: 'error', label: 'Errors' },
                        ]}
                    />
                </div>

                <button 
                    onClick={fetchLogs}
                    disabled={!activeAgent || isLoading}
                    className="ml-auto inline-flex items-center gap-2 p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 self-end"
                    title="Refresh logs"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin cursor-not-allowed' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-600 animate-in fade-in shrink-0 mr-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium leading-relaxed flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="hover:opacity-70 transition-opacity">
                        <span className="sr-only">Dismiss</span>×
                    </button>
                </div>
            )}

            {!activeAgent ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground mr-2">
                    <Terminal className="w-12 h-12 opacity-20 mb-4" />
                    <p>Select an agent above to view its execution logs.</p>
                </div>
            ) : isLoading && logs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center mr-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-xl border-dashed mr-2">
                    <Terminal className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No logs available</h3>
                    <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
                        This agent has not generated any records yet. Run the agent or a scheduled task to see activity here.
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col bg-secondary/20 dark:bg-[#0b0f19] text-foreground dark:text-gray-300 border border-border rounded-xl shadow-inner mr-2 relative font-mono text-sm leading-relaxed">
                    <div className="absolute top-0 w-full flex items-center bg-secondary/50 dark:bg-[#131b2e] border-b border-border dark:border-white/5 py-2 px-4 shadow-sm z-10">
                        <Terminal className="w-4 h-4 mr-2 opacity-50 text-foreground" />
                        <span className="text-xs font-bold uppercase tracking-widest opacity-50 text-foreground">Log Viewer</span>
                    </div>
                    <div ref={logContainerRef} onScroll={handleScrollUp} className="overflow-y-auto w-full pt-12 pb-4 px-4 flex-col-reverse flex">
                        <div className="space-y-2">
                            {loadingMore && (
                                <div className="flex justify-center py-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                </div>
                            )}
                            {logs.filter(log => {
                                if (logFilter === 'all') return true;
                                if (logFilter === 'error') return log.action === 'agent_error' || log.action === 'cycle_error';
                                if (logFilter === 'tool') return log.action.startsWith('tool:');
                                return log.action === logFilter;
                            }).map((log) => {
                                const isError = log.action === 'agent_error' || log.action === 'cycle_error';
                                const isToken = log.action === 'token_usage';
                                const isAction = log.action.startsWith('tool:');
                                const isThought = log.action === 'agent_invoke';

                                let displayType = 'info';
                                if (isError) displayType = 'error';
                                else if (isAction) displayType = 'action';
                                else if (isThought) displayType = 'thought';
                                else if (isToken) displayType = 'token';

                                return (
                                    <div key={log.id} className="flex items-start gap-4 animate-in fade-in duration-300 py-1 border-b border-border/50 dark:border-white/5 last:border-0 hover:bg-secondary/30 dark:hover:bg-white/[0.02] transition-colors">
                                         <div className="flex flex-col gap-1 items-start min-w-[120px] shrink-0">
                                            <span className="text-[10px] text-muted-foreground font-mono opacity-60">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                                            </span>
                                            <span className={clsx(
                                                 "uppercase text-[9px] font-bold tracking-wider select-none px-1.5 py-0.5 rounded",
                                                 displayType === 'info' && "bg-blue-500/10 text-blue-400",
                                                 displayType === 'token' && "bg-cyan-500/10 text-cyan-400",
                                                 displayType === 'thought' && "bg-yellow-500/10 text-yellow-400",
                                                 displayType === 'action' && "bg-pink-500/10 text-pink-400",
                                                 displayType === 'error' && "bg-red-500/10 text-red-500",
                                            )}>
                                                {log.action}
                                            </span>
                                         </div>

                                         <div className="flex-1 flex flex-col gap-2 min-w-0 pr-4">
                                            {log.thought && log.thought !== 'null' && (
                                                <div className="text-muted-foreground break-words font-sans text-sm">
                                                    <span className="text-xs uppercase font-bold tracking-wider opacity-50 dark:opacity-30 mr-2">Input/Thought</span>
                                                    {log.thought}
                                                </div>
                                            )}
                                            {log.result && log.result !== 'null' && (
                                                <div className={clsx(
                                                     "break-words whitespace-pre-wrap leading-relaxed",
                                                     displayType === 'info' && "text-blue-500 dark:text-blue-100",
                                                     displayType === 'token' && "text-cyan-600 dark:text-cyan-100",
                                                     displayType === 'thought' && "text-yellow-600 dark:text-yellow-100",
                                                     displayType === 'action' && "text-pink-600 dark:text-pink-100",
                                                     displayType === 'error' && "text-red-600 dark:text-red-200 font-semibold",
                                                )}>
                                                    <span className="text-xs uppercase font-bold tracking-wider opacity-50 dark:opacity-30 mr-2 text-foreground dark:text-white">Result/Output</span>
                                                    {log.result}
                                                </div>
                                            )}
                                         </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div ref={endRef} />
                </div>
            )}
        </div>
    );
}
