import { AlertCircle, Bot, Check, MessageSquare, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Agent } from '../hooks/useAgents';
import { ApiClient } from '../lib/api';
import clsx from 'clsx';

interface AgentManagerProps {
    agents: Agent[];
    refreshAgents: () => void;
}
export function AgentManager({ agents, refreshAgents }: AgentManagerProps) {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [loopInterval, setLoopInterval] = useState(60);
    const [privateKey, setPrivateKey] = useState('');
    const [prompt, setPrompt] = useState('');
    const [creating, setCreating] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'paused'>('all');

    const filteredAgents = useMemo(() => {
        return agents.filter(agent => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = (agent.name ?? '').toLowerCase().includes(term) || 
                               (agent.id ?? '').toLowerCase().includes(term);
            const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [agents, searchTerm, statusFilter]);

    const handleCreate = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
            setError('Invalid agent name. Use only alphanumeric characters, dashes, or underscores.');
            return;
        }

        setError(null);

        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setCreating(true);
        try {
            const client = new ApiClient(token);
            await client.createAgent(
                trimmedName, 
                loopInterval * 1000, 
                privateKey ? privateKey.trim() : undefined,
                prompt ? prompt.trim() : undefined
            );
            
            setIsCreateModalOpen(false);
            setName('');
            setLoopInterval(60);
            setPrivateKey('');
            setPrompt('');
            setError(null);
            refreshAgents();
        } catch (e: any) {
            console.error(e);
            setError(e.error || e.message || 'Failed to create agent');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto pr-2 pb-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Manage Agents</h1>
                <p className="text-muted-foreground">Create, configure, and monitor your autonomous agents.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Agent List */}
                <div className="col-span-1 md:col-span-3 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                         <h2 className="font-semibold text-lg flex items-center gap-2">
                            <Bot className="w-5 h-5 text-muted-foreground" />
                            Active Agents
                         </h2>
                         <span className="text-xs font-medium px-2 py-1 bg-secondary rounded-full text-muted-foreground">
                             {agents.length} Total
                         </span>
                    </div>

                    {/* Filters Bar */}
                    <div className="px-6 py-4 bg-secondary/10 border-b border-border flex flex-col sm:flex-row gap-4">
                       <div className="relative flex-1">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                           <input 
                               value={searchTerm}
                               onChange={e => setSearchTerm(e.target.value)}
                               placeholder="Search by name or ID..."
                               className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                           />
                       </div>
                       <div className="flex items-center gap-3">
                           <div className="flex bg-background border border-border p-1 rounded-lg gap-1">
                               {(['all', 'running', 'paused'] as const).map(status => (
                                   <button
                                       key={status}
                                       onClick={() => setStatusFilter(status)}
                                       className={clsx(
                                           "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all",
                                           statusFilter === status 
                                               ? "bg-primary text-primary-foreground shadow-sm" 
                                               : "text-muted-foreground hover:bg-secondary"
                                       )}
                                   >
                                       {status}
                                   </button>
                               ))}
                           </div>
                           <button 
                               onClick={() => setIsCreateModalOpen(true)}
                               className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium rounded-md transition-colors"
                           >
                               <Plus className="w-4 h-4" />
                               New Agent
                           </button>
                       </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Name</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">ID</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredAgents.map(agent => (
                                    <tr 
                                        key={agent.id} 
                                        className="hover:bg-secondary/20 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/agents/${agent.id}`)}
                                    >
                                        <td className="px-6 py-4 font-medium">{agent.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                agent.status === 'running' && "bg-green-500/10 text-green-500",
                                                agent.status === 'paused' && "bg-orange-500/10 text-orange-500",
                                            )}>
                                                <span className={clsx(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    agent.status === 'running' && "bg-green-500",
                                                    agent.status === 'paused' && "bg-orange-500",
                                                )} />
                                                {agent.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground text-xs">
                                            {agent.id.slice(0, 8)}...
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/?agent=${agent.id}`); }}
                                                className="text-xs px-2 py-1 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded font-medium transition-colors inline-flex items-center gap-1"
                                                title="Chat with Agent"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}
                                                className="text-xs px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded font-medium transition-colors"
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAgents.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                            {searchTerm || statusFilter !== 'all' 
                                                ? "No agents match your filters." 
                                                : "No agents created yet. Use the form to create one."
                                            }
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Agent Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 mx-4">
                            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-primary" />
                                    Create New Agent
                                </h3>
                                <button 
                                    onClick={() => setIsCreateModalOpen(false)} 
                                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-4">
                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <p className="text-xs font-medium leading-relaxed">{error}</p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Name</label>
                                        <input 
                                            value={name} 
                                            onChange={e => setName(e.target.value)}
                                            placeholder="e.g. my-agent" 
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Loop Interval (Seconds)</label>
                                        <input 
                                            type="number"
                                            min="1"
                                            value={loopInterval} 
                                            onChange={e => setLoopInterval(parseInt(e.target.value) || 1)}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground">Private Key (Optional)</label>
                                        <input 
                                            type="password"
                                            value={privateKey} 
                                            onChange={e => setPrivateKey(e.target.value)}
                                            placeholder="Base58 Private Key" 
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground">Initial Prompt (Optional)</label>
                                    <textarea 
                                        value={prompt} 
                                        onChange={e => setPrompt(e.target.value)} 
                                        placeholder="Describe the agent's goals and instructions..." 
                                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm font-mono h-[calc(100%-24px)] min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-border">
                                <button 
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors border border-border"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleCreate} 
                                    disabled={creating || !name}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            Create Agent
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
