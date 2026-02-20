import { clsx } from 'clsx';
import { Bot, Plus, Power, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { ApiClient } from '../lib/api';

interface AgentManagerProps {
    agents: Agent[];
    refreshAgents: () => void;
}

export function AgentManager({ agents, refreshAgents }: AgentManagerProps) {
    const [name, setName] = useState('');
    const [role, setRole] = useState('Assistant');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setCreating(true);
        try {
            const client = new ApiClient(token);
            await client.createAgent(name, role);
            setName('');
            refreshAgents();
        } catch (e) {
            console.error(e);
            alert('Failed to create agent');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
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
                            <label className="text-sm font-medium text-muted-foreground">Agent Name</label>
                            <input 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="e.g. TreasuryOps" 
                                className="w-full px-3 py-2 bg-secondary/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Role</label>
                            <select 
                                value={role} 
                                onChange={e => setRole(e.target.value)}
                                className="w-full px-3 py-2 bg-secondary/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            >
                                <option value="Assistant">Assistant</option>
                                <option value="Trader">Trader</option>
                                <option value="Researcher">Researcher</option>
                            </select>
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
                                    <th className="px-6 py-3 font-medium">Role</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">ID</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {agents.map(agent => (
                                    <tr key={agent.id} className="hover:bg-secondary/20 transition-colors">
                                        <td className="px-6 py-4 font-medium">{agent.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                                                {agent.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                agent.status === 'active' && "bg-green-500/10 text-green-500",
                                                agent.status === 'paused' && "bg-orange-500/10 text-orange-500",
                                                agent.status === 'stopped' && "bg-red-500/10 text-red-500",
                                            )}>
                                                <span className={clsx(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    agent.status === 'active' && "bg-green-500",
                                                    agent.status === 'paused' && "bg-orange-500",
                                                    agent.status === 'stopped' && "bg-red-500",
                                                )} />
                                                {agent.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground text-xs">
                                            {agent.id.slice(0, 8)}...
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {/* Action buttons would go here. For now just mock icons. */}
                                            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-secondary rounded">
                                                <Power className="w-4 h-4" />
                                            </button>
                                            <button className="text-muted-foreground hover:text-red-500 transition-colors p-1 hover:bg-secondary rounded">
                                                 <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {agents.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
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
