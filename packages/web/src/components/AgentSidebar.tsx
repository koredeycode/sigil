import { clsx } from 'clsx';
import { Bot, ExternalLink, MessageSquare } from 'lucide-react';
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
                        <div className="relative">
                            <Bot className="w-5 h-5 text-muted-foreground" />
                            <span className={clsx(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                                agent.status === 'running' && "bg-green-500",
                                agent.status === 'paused' && "bg-orange-500",
                                agent.status === 'killed' && "bg-red-500",
                                agent.status === 'running' && "animate-pulse"
                            )} />
                        </div>
                        <span className="truncate max-w-[120px] font-medium">{agent.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link 
                            to="/"
                            onClick={(e) => { e.stopPropagation(); onSelectAgent(agent.id); }}
                            className="p-1 rounded-sm hover:bg-background/20 text-muted-foreground hover:text-foreground transition-colors"
                            title="Open Chat"
                        >
                            <MessageSquare className="w-3 h-3" />
                        </Link>
                        <Link 
                            to={`/agents/${agent.id}`}
                            onClick={(e) => { e.stopPropagation(); onSelectAgent(agent.id); }}
                            className="p-1 rounded-sm hover:bg-background/20 text-muted-foreground hover:text-foreground transition-colors"
                            title="View Details"
                        >
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </li>
            ))}
        </ul>
    );
}
