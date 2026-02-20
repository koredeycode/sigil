import { clsx } from 'clsx';
import { Bot, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
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
                    <div className="flex items-center gap-2">
                        <span className={clsx(
                            "w-2 h-2 rounded-full",
                            agent.status === 'running' && "bg-green-500",
                            agent.status === 'paused' && "bg-orange-500",
                            agent.status === 'killed' && "bg-red-500",
                        )} />
                        <Link 
                            to={`/agents/${agent.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-sm hover:bg-background/20 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </li>
            ))}
        </ul>
    );
}
