import { Check, Edit2, Plus, Target, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { ApiClient, type Directive } from '../lib/api';
import { ConfirmationModal } from './ConfirmationModal';

interface DirectiveManagerProps {
    activeAgent: Agent | null;
}

export function DirectiveManager({ activeAgent }: DirectiveManagerProps) {
    const [directives, setDirectives] = useState<Directive[]>([]);
    const [condition, setCondition] = useState('');
    const [action, setAction] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editCondition, setEditCondition] = useState('');
    const [editAction, setEditAction] = useState('');
    const [deletingDir, setDeletingDir] = useState<Directive | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadDirectives = useCallback(async () => {
        if (!activeAgent) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        try {
            const client = new ApiClient(token);
            const response = await client.getDirectives(activeAgent.id);
            // Map the API response format back to what the UI expects if they differ
            setDirectives(response.data?.map((d: any) => ({
                id: d.id,
                agentId: d.agentId || d.agent_id,
                condition: d.condition,
                action: d.action,
                isActive: d.isActive || d.is_active,
                maxAmount: d.maxAmount || d.max_amount,
                cooldown: d.cooldown,
                lastExec: d.lastExec || d.last_exec,
                createdAt: d.createdAt || d.created_at
            })) || []);
        } catch (e) {
            console.error('Failed to load directives:', e);
        }
    }, [activeAgent]);

    useEffect(() => {
        loadDirectives();
    }, [loadDirectives]);

    if (!activeAgent) return <div className="p-4 text-muted-foreground text-sm">Select an agent</div>;

    const handleAdd = async () => {
        if (!activeAgent || !condition.trim() || !action.trim()) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setLoading(true);
        try {
            const client = new ApiClient(token);
            await client.addDirective(activeAgent.id, condition, action);
            setCondition('');
            setAction('');
            loadDirectives();
        } catch (e) {
            console.error('Failed to add directive:', e);
            alert('Failed to add directive');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const token = localStorage.getItem('sigil_token');
        if (!token) return;
        setIsDeleting(true);
        try {
            const client = new ApiClient(token);
            await client.deleteDirective(id);
            setDeletingDir(null);
            loadDirectives();
        } catch (e) {
            console.error('Failed to delete directive:', e);
            alert('Failed to delete directive');
        } finally {
            setIsDeleting(false);
        }
    };

    const startEditing = (dir: Directive) => {
        setEditingId(dir.id);
        setEditCondition(dir.condition);
        setEditAction(dir.action);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditCondition('');
        setEditAction('');
    };

    const handleSaveEdit = async (id: number) => {
        if (!editCondition.trim() || !editAction.trim()) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;
        
        try {
            const client = new ApiClient(token);
            await client.updateDirective(id, editCondition, editAction);
            setEditingId(null);
            loadDirectives();
        } catch (e) {
            console.error('Failed to update directive:', e);
            alert('Failed to update directive');
        }
    };

    if (!activeAgent) return <div className="p-4 text-muted-foreground text-sm">Select an agent</div>;

    return (
        <div className="flex flex-col p-4 space-y-4">
             <div className="flex flex-col gap-2">
                <input 
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="Condition (e.g. 'SOL > $1000')" 
                    className="flex-1 px-3 py-1.5 bg-secondary/50 border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm placeholder:text-muted-foreground"
                />
                <div className="flex gap-2">
                    <input 
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        placeholder="Action (e.g. 'Sell 1 SOL')" 
                        className="flex-1 px-3 py-1.5 bg-secondary/50 border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm placeholder:text-muted-foreground"
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={loading || !condition.trim() || !action.trim()}
                        className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        <Plus className="w-3 h-3" /> {loading ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {directives.map((dir) => (
                    <div key={dir.id} className="p-3 bg-secondary/20 border border-border rounded flex items-start gap-3 group">
                        <div className="mt-0.5 p-1 rounded-full bg-primary/10 text-primary">
                            <Target className="w-3 h-3" />
                        </div>
                        
                        {editingId === dir.id ? (
                             <div className="flex-1 min-w-0 space-y-2">
                                <input 
                                    value={editCondition}
                                    onChange={(e) => setEditCondition(e.target.value)}
                                    className="w-full px-2 py-1 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <input 
                                    value={editAction}
                                    onChange={(e) => setEditAction(e.target.value)}
                                    className="w-full px-2 py-1 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <div className="flex items-center gap-2 pt-1">
                                    <button onClick={() => handleSaveEdit(dir.id)} className="p-1 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={cancelEditing} className="p-1 rounded bg-secondary text-muted-foreground hover:bg-secondary/80"><X className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">IF {dir.condition}</p>
                                    <p className="text-xs text-muted-foreground truncate">THEN {dir.action}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => startEditing(dir)}
                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                                        title="Edit Directive"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => setDeletingDir(dir)}
                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                        title="Delete Directive"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {directives.length === 0 && (
                     <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded">
                        No active directives
                    </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={deletingDir !== null}
                onClose={() => setDeletingDir(null)}
                onConfirm={() => deletingDir && handleDelete(deletingDir.id)}
                isLoading={isDeleting}
                title="Delete Directive"
                message={`Are you sure you want to delete this directive? "IF ${deletingDir?.condition} THEN ${deletingDir?.action}"`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
