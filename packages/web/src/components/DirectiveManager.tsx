import { Plus, Target } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { ApiClient } from '../lib/api';

interface DirectiveManagerProps {
    activeAgent: Agent | null;
}

interface Directive {
    id: number;
    agentId: string;
    condition: string;
    action: string;
    isActive: number | boolean;
}

export function DirectiveManager({ activeAgent }: DirectiveManagerProps) {
    const [directives, setDirectives] = useState<Directive[]>([]);
    const [condition, setCondition] = useState('');
    const [action, setAction] = useState('');
    const [loading, setLoading] = useState(false);

    const loadDirectives = useCallback(async () => {
        if (!activeAgent) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        try {
            const client = new ApiClient(token);
            const response = await client.getDirectives(activeAgent.id);
            setDirectives(response.data || []);
        } catch (e) {
            console.error('Failed to load directives:', e);
        }
    }, [activeAgent]);

    useEffect(() => {
        loadDirectives();
    }, [loadDirectives]);

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
                    <div key={dir.id} className="p-3 bg-secondary/20 border border-border rounded flex items-start gap-3">
                        <div className="mt-0.5 p-1 rounded-full bg-primary/10 text-primary">
                            <Target className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">IF {dir.condition}</p>
                            <p className="text-xs text-muted-foreground truncate">THEN {dir.action}</p>
                        </div>
                    </div>
                ))}

                {directives.length === 0 && (
                     <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded">
                        No active directives
                    </div>
                )}
            </div>
        </div>
    );
}
