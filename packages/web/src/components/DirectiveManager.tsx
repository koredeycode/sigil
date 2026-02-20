import { Plus, Target } from 'lucide-react';
import type { Agent } from '../hooks/useAgents';

interface DirectiveManagerProps {
    activeAgent: Agent | null;
}

export function DirectiveManager({ activeAgent }: DirectiveManagerProps) {
    if (!activeAgent) return <div className="p-4 text-muted-foreground text-sm">Select an agent</div>;

    return (
        <div className="flex flex-col p-4 space-y-3">
             <div className="flex gap-2">
                <input 
                    placeholder="New directive (e.g., 'Maintain > 2 SOL')" 
                    className="flex-1 px-3 py-1.5 bg-secondary border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm placeholder:text-muted-foreground"
                />
                <button className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-xs font-medium transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                </button>
            </div>
            
            <div className="space-y-2">
                {/* Mock Directive */}
                <div className="p-3 bg-secondary/20 border border-border rounded flex items-start gap-3">
                    <div className="mt-0.5 p-1 rounded-full bg-primary/10 text-primary">
                        <Target className="w-3 h-3" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Accumulate SOL on dips</p>
                        <p className="text-xs text-muted-foreground">Priority: High • Active: 2h ago</p>
                    </div>
                </div>
                 <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded">
                    No active directives
                </div>
            </div>
        </div>
    );
}
