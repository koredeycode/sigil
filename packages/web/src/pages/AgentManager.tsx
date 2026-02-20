import { clsx } from 'clsx';
import { Bot, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { ApiClient } from '../lib/api';

interface AgentManagerProps {
    agents: Agent[];
    refreshAgents: () => void;
    onSelectAgent?: (id: string) => void;
}

export function AgentManager({ agents, refreshAgents, onSelectAgent }: AgentManagerProps) {
    const [name, setName] = useState('');
    const [loopInterval, setLoopInterval] = useState(60);
    const [privateKey, setPrivateKey] = useState('');
    const [condition, setCondition] = useState('');
    const [action, setAction] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setCreating(true);
        try {
            const client = new ApiClient(token);
            const response = await client.createAgent(name, loopInterval * 1000, privateKey ? privateKey.trim() : undefined);
            const agent = response.data;
            
            if (agent && agent.id && condition.trim() && action.trim()) {
                await client.addDirective(agent.id, condition, action);
            }

            setName('');
            setLoopInterval(60);
            setPrivateKey('');
            setCondition('');
            setAction('');
            refreshAgents();
        } catch (e) {
            console.error(e);
            alert('Failed to create agent');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto pr-2 pb-6 space-y-6">
            <header>
                <h1 className="text-2xl font-bold tracking-tight">Manage Agents</h1>
                <p className="text-muted-foreground">Create, configure, and monitor your autonomous agents.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Create Agent Card */}
                <div className="col-span-1 bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-4">
                        <Plus className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-lg">Create New Agent</h2>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Name</label>
                            <input 
                                value={name} 
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. treasury-agent" 
                                className="w-full px-3 py-2 bg-secondary/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm mb-2 font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Loop Interval (Seconds)</label>
                            <input 
                                type="number"
                                min="1"
                                value={loopInterval} 
                                onChange={e => setLoopInterval(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 bg-secondary/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm mb-2"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Private Key (Optional)</label>
                            <input 
                                type="password"
                                value={privateKey} 
                                onChange={e => setPrivateKey(e.target.value)}
                                placeholder="Base58 Private Key" 
                                className="w-full px-3 py-2 bg-secondary/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm mb-2 font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Initial Directive (Optional)</label>
                            <input 
                                value={condition} 
                                onChange={e => setCondition(e.target.value)} 
                                placeholder="Condition (e.g. 'SOL > $1000')" 
                                className="w-full px-3 py-2 bg-secondary/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm mb-2"
                            />
                            <input 
                                value={action} 
                                onChange={e => setAction(e.target.value)} 
                                placeholder="Action (e.g. 'Sell 1 SOL')" 
                                className="w-full px-3 py-2 bg-secondary/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                        </div>
                        <button 
                            onClick={handleCreate} 
                            disabled={creating || !name}
                            className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {creating ? 'Creating...' : 'Create Agent'}
                        </button>
                    </div>
                </div>

                {/* Agent List */}
                <div className="col-span-1 md:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                         <h2 className="font-semibold text-lg flex items-center gap-2">
                            <Bot className="w-5 h-5 text-muted-foreground" />
                            Active Agents
                         </h2>
                         <span className="text-xs font-medium px-2 py-1 bg-secondary rounded-full text-muted-foreground">
                             {agents.length} Total
                         </span>
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
                                {agents.map(agent => (
                                    <tr 
                                        key={agent.id} 
                                        className="hover:bg-secondary/20 transition-colors cursor-pointer"
                                        onClick={() => onSelectAgent?.(agent.id)}
                                    >
                                        <td className="px-6 py-4 font-medium">{agent.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                agent.status === 'running' && "bg-green-500/10 text-green-500",
                                                agent.status === 'paused' && "bg-orange-500/10 text-orange-500",
                                                agent.status === 'killed' && "bg-red-500/10 text-red-500",
                                            )}>
                                                <span className={clsx(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    agent.status === 'running' && "bg-green-500",
                                                    agent.status === 'paused' && "bg-orange-500",
                                                    agent.status === 'killed' && "bg-red-500",
                                                )} />
                                                {agent.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground text-xs">
                                            {agent.id.slice(0, 8)}...
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onSelectAgent?.(agent.id); }}
                                                className="text-xs px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded font-medium transition-colors"
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {agents.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                            No agents created yet. Use the form to create one.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
