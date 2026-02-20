import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { useSocket } from '../hooks/useSocket';
import { ApiClient } from '../lib/api';

interface LogTerminalProps {
    activeAgent: Agent | null;
}

interface LogEntry {
    type: 'info' | 'thought' | 'action' | 'error';
    content: string;
    timestamp: string;
}

export function LogTerminal({ activeAgent }: LogTerminalProps) {
    const { socket } = useSocket();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLogs([]); // Clear on agent switch
        if (!activeAgent) return;

        const fetchPastLogs = async () => {
            const token = localStorage.getItem('sigil_token');
            if (!token) return;
            try {
                const client = new ApiClient(token);
                const res = await client.getLogs(activeAgent.id, 50);
                if (res.data) {
                    const historical: LogEntry[] = res.data.reverse().map(log => {
                        let mappedType: 'info' | 'thought' | 'action' | 'error' = 'info';
                        if (log.action === 'llm_decision') mappedType = 'thought';
                        else if (log.action.startsWith('tool:')) mappedType = 'action';
                        else if (log.action.toLowerCase().includes('error')) mappedType = 'error';

                        return {
                            type: mappedType,
                            content: log.result || log.thought || log.action,
                            timestamp: new Date(log.timestamp).toLocaleTimeString()
                        };
                    });
                    setLogs(historical);
                }
            } catch (e) {
                console.error("Failed to fetch logs", e);
            }
        };

        fetchPastLogs();
    }, [activeAgent?.id]);

    useEffect(() => {
        if (!socket || !activeAgent) return;

        const handleLog = (data: any) => {
            if (data.agentId === activeAgent.id) {
                setLogs(prev => [...prev, {
                    type: data.type,
                    content: data.content,
                    timestamp: new Date().toLocaleTimeString()
                }]);
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

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    if (!activeAgent) return null;

    return (
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-secondary/20 space-y-2">
            {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 animate-in fade-in duration-300">
                     <span className="flex items-center gap-1 text-[10px] text-muted-foreground min-w-[70px] mt-0.5 select-none opacity-60">
                         {log.timestamp}
                     </span>
                     <div className="flex-1 break-words">
                        <span className={clsx(
                             "uppercase text-[10px] font-bold tracking-wider mr-2 select-none px-1.5 py-0.5 rounded",
                             log.type === 'info' && "bg-blue-500/10 text-blue-400",
                             log.type === 'thought' && "bg-yellow-500/10 text-yellow-400",
                             log.type === 'action' && "bg-pink-500/10 text-pink-400",
                             log.type === 'error' && "bg-red-500/10 text-red-400",
                        )}>
                            {log.type}
                        </span>
                        <span className={clsx(
                             "leading-relaxed",
                             log.type === 'info' && "text-blue-500 dark:text-blue-100",
                             log.type === 'thought' && "text-yellow-600 dark:text-yellow-100",
                             log.type === 'action' && "text-pink-600 dark:text-pink-100",
                             log.type === 'error' && "text-red-600 dark:text-red-200",
                        )}>
                            {log.content}
                        </span>
                     </div>
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}
