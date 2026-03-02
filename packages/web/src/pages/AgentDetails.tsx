import { AlertCircle, Check, Copy, Pause, Play, Settings, Terminal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ApiClient } from '../lib/api';

import type { Agent } from '../hooks/useAgents';

export function AgentDetails({ activeAgent }: { activeAgent: Agent | null }) {
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editInterval, setEditInterval] = useState(60);
    const [editPrompt, setEditPrompt] = useState('');
    const [copiedKey, setCopiedKey] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'pause' | 'kill' | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (copiedKey) {
            const timer = setTimeout(() => setCopiedKey(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copiedKey]);

    if (!activeAgent) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
    };

    const handleControl = async (action: 'start' | 'pause' | 'kill') => {
        if ((action === 'pause' || action === 'kill') && !confirmAction) {
            setConfirmAction(action);
            return;
        }

        const token = localStorage.getItem('sigil_token');
        if (!token) return;
        
        setIsActionLoading(true);
        try {
            const client = new ApiClient(token);
            await client.controlAgent(activeAgent.id, action);
            setConfirmAction(null);
            setError(null);
        } catch (e: any) {
            console.error(`Failed to ${action} agent:`, e);
            setError(e.error || e.message || `Failed to ${action} agent`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const isRunning = activeAgent.status === 'running';
    const isPaused = activeAgent.status === 'paused';

    const openEditProfile = () => {
        setEditName(activeAgent.name);
        setEditInterval(activeAgent.loop_interval / 1000);
        setEditPrompt(activeAgent.prompt || '');
        setIsEditingProfile(true);
        setProfileError(null);
    };

    const handleUpdateProfile = async () => {
        if (!editName.trim() || editInterval < 1) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        try {
            const client = new ApiClient(token);
            await client.updateAgent(activeAgent.id, editName.trim(), editInterval * 1000, editPrompt.trim());
            setIsEditingProfile(false);
            setProfileError(null);
        } catch (e: any) {
            console.error('Failed to update agent profile:', e);
            setProfileError(e.error || e.message || 'Failed to update agent profile');
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium leading-relaxed flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="hover:opacity-70 transition-opacity">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
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
                    <div className="flex items-center justify-between border-b border-border pb-3">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-muted-foreground" />
                            Agent Profile
                        </h2>
                        <button 
                            onClick={openEditProfile}
                            className="p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground rounded transition-colors"
                            title="Edit Profile"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Public Key</label>
                            <div className="flex items-center gap-2 bg-secondary/50 p-2.5 rounded-md border border-border">
                                <code className="text-sm flex-1 truncate">{activeAgent.pubkey || 'No Pubkey'}</code>
                                <button 
                                    onClick={() => activeAgent.pubkey && copyToClipboard(activeAgent.pubkey)}
                                    className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                                    title={copiedKey ? "Copied!" : "Copy Public Key"}
                                >
                                    {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                                <div className="font-medium flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                        activeAgent.status === 'running' ? 'bg-green-500' : 'bg-orange-500'
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
                                <div className="font-medium text-sm text-foreground/80">{activeAgent.created_at ? new Date(activeAgent.created_at).toLocaleDateString() : 'Unknown'}</div>
                            </div>
                        </div>

                        {/* Agent Controls */}
                        <div className="pt-4 border-t border-border flex items-center gap-3">
                            <button
                                onClick={() => handleControl('start')}
                                disabled={isRunning}
                                className={`flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
                                    isRunning 
                                        ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed' 
                                        : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                                }`}
                            >
                                <Play className="w-4 h-4" /> Start
                            </button>
                            <button
                                onClick={() => handleControl('pause')}
                                disabled={isPaused}
                                className={`flex-1 flex justify-center items-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
                                    isPaused 
                                        ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed' 
                                        : 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'
                                }`}
                            >
                                <Pause className="w-4 h-4" /> Pause
                            </button>
                        </div>
                    </div>
                </div>

                {/* Instructions Manager */}
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Agent Instructions</h2>
                            <p className="text-sm text-muted-foreground">The prompt driving this agent's autonomous cycle.</p>
                        </div>
                        <button
                            onClick={() => {
                                setEditName(activeAgent.name);
                                setEditInterval(activeAgent.loop_interval / 1000);
                                setEditPrompt(activeAgent.prompt || '');
                                setIsEditingProfile(true);
                                setProfileError(null);
                            }}
                            className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-primary/20"
                        >
                            Edit Instructions
                        </button>
                    </div>
                    <div className="flex-1 min-h-0 bg-background/50 p-6 overflow-y-auto">
                       {activeAgent.prompt ? (
                           <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed p-4 bg-secondary/30 border border-border rounded-md">
                               {activeAgent.prompt}
                           </div>
                       ) : (
                           <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                               <AlertCircle className="w-8 h-8 opacity-20" />
                               <p className="text-sm">No specific instructions set.</p>
                           </div>
                       )}
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h3 className="text-lg font-semibold">Edit Agent Profile</h3>
                            <button onClick={() => setIsEditingProfile(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {profileError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <p className="text-xs font-medium">{profileError}</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Agent Name</label>
                                <input 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g. TradingBot_v2"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Loop Interval (Seconds)</label>
                                <input 
                                    type="number"
                                    value={editInterval}
                                    onChange={(e) => setEditInterval(parseInt(e.target.value) || 1)}
                                    min="1"
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Instructions</label>
                                <textarea 
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    placeholder="Describe the agent's goals and instructions..."
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-y font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-secondary/20">
                            <button 
                                onClick={() => setIsEditingProfile(false)}
                                className="px-4 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors border border-border"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateProfile}
                                disabled={!editName.trim() || editInterval < 1}
                                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal 
                isOpen={confirmAction !== null}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => confirmAction && handleControl(confirmAction)}
                isLoading={isActionLoading}
                title={confirmAction === 'kill' ? 'Kill Agent' : 'Pause Agent'}
                message={confirmAction === 'kill' 
                    ? `Are you sure you want to kill ${activeAgent.name}? This will stop the agent immediately and prevent it from running until restarted.`
                    : `Are you sure you want to pause ${activeAgent.name}? It will stop its current cycle but can be resumed later.`
                }
                confirmText={confirmAction === 'kill' ? 'Kill Agent' : 'Pause Agent'}
                variant={confirmAction === 'kill' ? 'danger' : 'warning'}
            />
        </div>
    );
}
