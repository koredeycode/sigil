import { clsx } from 'clsx';
import { Bot } from 'lucide-react';
import type { Agent } from '../hooks/useAgents';

interface AgentSidebarProps {
    agents: Agent[];
    activeAgentId: string | null;
    onSelectAgent: (id: string) => void;
}

export function AgentSidebar({ agents, activeAgentId, onSelectAgent }: AgentSidebarProps) {
    if (agents.length === 0) {
        return <div className="px-3 text-sm text-muted-foreground">No agents found</div>;
    }

    return (
        <ul className="space-y-1">
            {agents.map(agent => (
                <li 
                    key={agent.id} 
                    onClick={() => onSelectAgent(agent.id)}
                    className={clsx(
                        "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                         activeAgentId === agent.id 
                            ? "bg-secondary text-foreground font-medium" 
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        <span className="truncate max-w-[120px]">{agent.name}</span>
                    </div>
                    <span className={clsx(
                        "w-2 h-2 rounded-full",
                        agent.status === 'active' && "bg-green-500",
                        agent.status === 'paused' && "bg-orange-500",
                        agent.status === 'stopped' && "bg-red-500",
                    )} />
                </li>
            ))}
        </ul>
    );
}
