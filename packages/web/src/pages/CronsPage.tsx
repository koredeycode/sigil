import { AlertCircle, Clock, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { ApiClient } from '../lib/api';

export function CronsPage({ activeAgent, agents, onSelectAgent }: { activeAgent: Agent | null, agents: Agent[], onSelectAgent: (id: string) => void }) {
    const [crons, setCrons] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [scheduleType, setScheduleType] = useState('0 * * * *');
    const [newExpression, setNewExpression] = useState('0 * * * *');
    const [newTaskPrompt, setNewTaskPrompt] = useState('');

    const fetchCrons = async () => {
        if (!activeAgent) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setIsLoading(true);
        setError(null);
        try {
            const client = new ApiClient(token);
            const res = await client.getCronJobs(activeAgent.id);
            setCrons(res.data || []);
        } catch (err: any) {
            console.error('Failed to fetch crons:', err);
            setError(err.error || err.message || 'Failed to fetch crons');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCrons();
    }, [activeAgent?.id]);

    const handleCreate = async () => {
        if (!activeAgent) return;
        if (!newName.trim() || !newExpression.trim() || !newTaskPrompt.trim()) {
            setError('Please fill in all fields (name, schedule, and prompt).');
            return;
        }

        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        try {
            const client = new ApiClient(token);
            const finalExpression = scheduleType === 'custom' ? newExpression.trim() : scheduleType;
            await client.createCronJob(activeAgent.id, newName.trim(), finalExpression, newTaskPrompt.trim());
            setIsCreating(false);
            setNewName('');
            setScheduleType('0 * * * *');
            setNewExpression('0 * * * *');
            setNewTaskPrompt('');
            await fetchCrons();
        } catch (err: any) {
            console.error('Failed to create cron:', err);
            setError(err.error || err.message || 'Failed to create cron job');
        }
    };

    const handleToggle = async (id: number, active: boolean) => {
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        try {
            const client = new ApiClient(token);
            await client.toggleCronJob(id, active);
            await fetchCrons();
        } catch (err: any) {
            console.error('Failed to toggle cron:', err);
            setError(err.error || err.message || 'Failed to toggle cron job');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this scheduled task?')) return;
        
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        try {
            const client = new ApiClient(token);
            await client.deleteCronJob(id);
            await fetchCrons();
        } catch (err: any) {
            console.error('Failed to delete cron:', err);
            setError(err.error || err.message || 'Failed to delete cron job');
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2">
            <header className="flex flex-col space-y-2 shrink-0">
                <h1 className="text-3xl font-bold tracking-tight">Scheduled Tasks</h1>
                <p className="text-muted-foreground">Manage and monitor periodic agent executions (crons).</p>
            </header>

            {/* Agent Selector */}
            <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 shrink-0 shadow-sm">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Target Agent:</label>
                <select 
                    value={activeAgent?.id || ''} 
                    onChange={(e) => onSelectAgent(e.target.value)}
                    className="flex-1 max-w-sm bg-background border border-input text-foreground text-sm rounded-md focus:ring-primary focus:border-primary block p-2"
                >
                    <option value="" disabled>Select an agent to view crons</option>
                    {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
                <button 
                    onClick={() => setIsCreating(true)}
                    disabled={!activeAgent}
                    className="ml-auto inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                >
                    <Plus className="w-4 h-4" />
                    New Cron Job
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-600 animate-in fade-in shrink-0">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium leading-relaxed flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="hover:opacity-70 transition-opacity">
                        <span className="sr-only">Dismiss</span>×
                    </button>
                </div>
            )}

            {isCreating && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm shrink-0">
                    <h3 className="font-semibold flex items-center gap-2 border-b border-border pb-3">
                        <Clock className="w-4 h-4 text-primary" />
                        Create New Scheduled Task
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Task Name</label>
                            <input 
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary"
                                placeholder="e.g. Daily Yield Harvest"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Cron Schedule</label>
                            <select
                                value={scheduleType}
                                onChange={(e) => {
                                    setScheduleType(e.target.value);
                                    if (e.target.value !== 'custom') {
                                        setNewExpression(e.target.value);
                                    }
                                }}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary block mb-2"
                            >
                                <option value="* * * * *">Every minute</option>
                                <option value="*/5 * * * *">Every 5 minutes</option>
                                <option value="*/15 * * * *">Every 15 minutes</option>
                                <option value="0 * * * *">Every hour</option>
                                <option value="0 0 * * *">Every day at midnight</option>
                                <option value="custom">Custom expression...</option>
                            </select>
                            
                            {scheduleType === 'custom' && (
                                <div className="space-y-1 mt-2">
                                    <input 
                                        value={newExpression}
                                        onChange={(e) => setNewExpression(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm font-mono focus:ring-2 focus:ring-primary"
                                        placeholder="0 * * * *"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Standard cron syntax (minute, hour, dom, month, dow)</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-semibold text-muted-foreground">Execution Prompt</label>
                            <textarea 
                                value={newTaskPrompt}
                                onChange={(e) => setNewTaskPrompt(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm font-mono h-24 resize-y focus:ring-2 focus:ring-primary"
                                placeholder="e.g. Check all yield farms and harvest rewards if gas is under 15 gwei..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors border border-border"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleCreate}
                            disabled={!newName || !newExpression || !newTaskPrompt}
                            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Save Task
                        </button>
                    </div>
                </div>
            )}

            {!activeAgent ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <Clock className="w-12 h-12 opacity-20 mb-4" />
                    <p>Select an agent above to view its scheduled tasks.</p>
                </div>
            ) : isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : crons.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-xl border-dashed">
                    <Clock className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No scheduled tasks</h3>
                    <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
                        This agent has no cron jobs configured. Create a scheduled task to run periodic actions autonomously.
                    </p>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden shrink-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Status / Name</th>
                                    <th className="px-6 py-3 font-semibold">Schedule</th>
                                    <th className="px-6 py-3 font-semibold">Prompt</th>
                                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {crons.map((cron) => (
                                    <tr key={cron.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className={`w-2 h-2 rounded-full shrink-0 ${cron.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-muted-foreground/30'}`} 
                                                    title={cron.active ? 'Active' : 'Inactive'}
                                                />
                                                <span className="font-medium">{cron.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="bg-secondary px-2 py-0.5 rounded text-xs text-muted-foreground">
                                                {cron.expression}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <span className="truncate block font-mono text-xs text-muted-foreground" title={cron.task_prompt}>
                                                {cron.task_prompt}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggle(cron.id, !cron.active)}
                                                    className={`inline-flex items-center justify-center p-1.5 rounded-md hover:bg-secondary transition-colors ${cron.active ? 'text-orange-500 hover:text-orange-600' : 'text-green-500 hover:text-green-600'}`}
                                                    title={cron.active ? "Pause Task" : "Resume Task"}
                                                >
                                                    {cron.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cron.id)}
                                                    className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                                    title="Delete Task"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
