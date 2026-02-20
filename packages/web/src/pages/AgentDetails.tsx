import { Copy, Pause, Play, Square, Terminal } from 'lucide-react';
import { DirectiveManager } from '../components/DirectiveManager';
import { ApiClient } from '../lib/api';

export function AgentDetails({ activeAgent }: { activeAgent: any }) {
    // const { apiPort, token } = useConfig();

    if (!activeAgent) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Simple mock toast for copy
        alert('Copied to clipboard!');
    };

    const handleControl = async (action: 'start' | 'pause' | 'kill') => {
        const token = localStorage.getItem('sigil_token');
        if (!token) return;
        try {
            const client = new ApiClient(token);
            await client.controlAgent(activeAgent.id, action);
        } catch (error) {
            console.error(`Failed to ${action} agent:`, error);
        }
    };

    const isRunning = activeAgent.status === 'running';
    const isPaused = activeAgent.status === 'paused';
    const isKilled = activeAgent.status === 'killed';

    return (
        <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2">
            <header className="flex flex-col space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{activeAgent.name}</h1>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {activeAgent.role}
                    </span>
                </div>
                <p className="text-muted-foreground">Manage settings, keys, and operating directives.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Info Card */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-3">
                        <Terminal className="w-5 h-5 text-muted-foreground" />
                        Agent Profile
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Public Key</label>
                            <div className="flex items-center gap-2 bg-secondary/50 p-2.5 rounded-md border border-border">
                                <code className="text-sm flex-1 truncate">{activeAgent.pubkey}</code>
                                <button 
                                    onClick={() => copyToClipboard(activeAgent.pubkey)}
                                    className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                                <div className="font-medium flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                        activeAgent.status === 'running' ? 'bg-green-500' :
                                        activeAgent.status === 'paused' ? 'bg-orange-500' : 'bg-red-500'
                                    }`} />
                                    {activeAgent.status}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interval</label>
                                <div className="font-medium">{activeAgent.loop_interval / 1000}s</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agent ID</label>
                                <div className="font-medium font-mono text-sm">{activeAgent.id.toString().padStart(4, '0')}</div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</label>
                                <div className="font-medium text-sm text-foreground/80">{new Date(activeAgent.created_at).toLocaleDateString()}</div>
                            </div>
                        </div>

                        {/* Agent Controls */}
                        <div className="pt-4 border-t border-border flex items-center gap-3">
                            <button
                                onClick={() => handleControl('start')}
                                disabled={isRunning || isKilled}
                                className={`flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
                                    isRunning || isKilled 
                                        ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed' 
                                        : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                                }`}
                            >
                                <Play className="w-4 h-4" /> Start
                            </button>
                            <button
                                onClick={() => handleControl('pause')}
                                disabled={isPaused || isKilled}
                                className={`flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
                                    isPaused || isKilled 
                                        ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed' 
                                        : 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'
                                }`}
                            >
                                <Pause className="w-4 h-4" /> Pause
                            </button>
                            <button
                                onClick={() => handleControl('kill')}
                                disabled={isKilled}
                                className={`flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
                                    isKilled 
                                        ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed' 
                                        : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                                }`}
                            >
                                <Square className="w-4 h-4 fill-current" /> Kill
                            </button>
                        </div>
                    </div>
                </div>

                {/* Directives Manager */}
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30">
                        <h2 className="text-lg font-semibold">Operating Directives</h2>
                        <p className="text-sm text-muted-foreground">Rules and guidelines this agent must follow.</p>
                    </div>
                    <div className="flex-1 min-h-0 bg-background/50">
                       <DirectiveManager activeAgent={activeAgent} />
                    </div>
                </div>
            </div>
        </div>
    );
}
