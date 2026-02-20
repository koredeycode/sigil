import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { useSocket } from '../hooks/useSocket';

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
        
        // Mock init log
        setLogs([{ type: 'info', content: `Connected to log stream for ${activeAgent.name}`, timestamp: new Date().toLocaleTimeString() }]);

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
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-black/40 space-y-2">
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
                             log.type === 'info' && "text-blue-100",
                             log.type === 'thought' && "text-yellow-100",
                             log.type === 'action' && "text-pink-100",
                             log.type === 'error' && "text-red-200",
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
