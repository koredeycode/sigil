import { Bot, Check, Loader2, Monitor, Palette, Plus, Shield, Wallet, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ApiClient } from '../lib/api';

export interface AIProvider {
    id: number;
    name: string;
    model: string;
    is_primary: number;
}

export function SettingsPage() {
    const [providers, setProviders] = useState<AIProvider[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [settingPrimary, setSettingPrimary] = useState<number | null>(null);

    // Add Provider State
    const [isAddingProvider, setIsAddingProvider] = useState(false);
    const [newProvider, setNewProvider] = useState('openai');
    const [newApiKey, setNewApiKey] = useState('');
    const [availableModels, setAvailableModels] = useState<{ id: string; label: string }[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [selectedModel, setSelectedModel] = useState('');

    const { theme, setTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const fetchProviders = useCallback(async () => {
        const token = localStorage.getItem('sigil_token');
        if (!token) return;
        try {
            setLoadingProviders(true);
            const client = new ApiClient(token);
            const response = await client.getProviders();
            setProviders(response.data || []);
        } catch (e) {
            console.error('Failed to fetch providers', e);
        } finally {
            setLoadingProviders(false);
        }
    }, []);

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    const handleSetPrimary = async (id: number) => {
        const token = localStorage.getItem('sigil_token');
        if (!token) return;
        try {
            setSettingPrimary(id);
            const client = new ApiClient(token);
            await client.setPrimaryProvider(id);
            await fetchProviders();
        } catch (e) {
            console.error('Failed to set primary provider', e);
        } finally {
            setSettingPrimary(null);
        }
    };

    const handleFetchModels = async () => {
        if (!newApiKey.trim()) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setLoadingModels(true);
        try {
            const client = new ApiClient(token);
            const response = await client.fetchModels(newProvider, newApiKey);

            if (response.data && response.data.error) {
                alert(response.data.error);
                setAvailableModels([]);
            } else if (response.data && response.data.models) {
                setAvailableModels(response.data.models);
                if (response.data.models.length > 0) {
                    setSelectedModel(response.data.models[0].id);
                }
            }
        } catch (e) {
            console.error('Failed to fetch models', e);
            alert('Failed to fetch models. Check API key and provider.');
        } finally {
            setLoadingModels(false);
        }
    };

    const handleAddProvider = async () => {
        if (!newApiKey.trim() || !selectedModel) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        try {
            const client = new ApiClient(token);
            await client.addProvider(newProvider, newApiKey, selectedModel);
            setIsAddingProvider(false);
            setNewApiKey('');
            setAvailableModels([]);
            fetchProviders();
        } catch (e) {
            console.error('Failed to add provider', e);
            alert('Failed to add provider');
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto space-y-8 max-w-5xl mx-auto py-4 px-1">
            <header className="space-y-1 block">
                <h1 className="text-3xl font-bold tracking-tight">Preferences</h1>
                <p className="text-muted-foreground text-sm">Manage dashboard settings, RPC nodes, and AI configurations.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Column 1 */}
                <div className="space-y-8">
                    {/* General Settings */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            System
                        </h2>
                        <div className="bg-card border border-border rounded-xl divide-y divide-border shadow-sm">
                            <div className="p-4 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="font-medium text-sm">Dashboard Version</h3>
                                    <p className="text-xs text-muted-foreground">Currently installed build</p>
                                </div>
                                <span className="font-mono text-xs bg-secondary px-2 py-1 rounded-md text-muted-foreground font-medium">v0.1.0</span>
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                 <div className="space-y-0.5">
                                    <h3 className="font-medium text-sm">API Endpoint</h3>
                                    <p className="text-xs text-muted-foreground">Connection to Core API</p>
                                </div>
                                <code className="text-xs font-mono bg-secondary px-2 py-1 rounded-md text-primary font-medium">{window.location.hostname}:7445</code>
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                 <div className="space-y-0.5">
                                    <h3 className="font-medium text-sm">Developer Mode</h3>
                                    <p className="text-xs text-muted-foreground">Enable verbose internal logs</p>
                                </div>
                                <button className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                                    <span className="translate-x-0 inline-block h-4 w-4 transform rounded-full bg-muted-foreground transition-transform"></span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Appearance */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            Appearance
                        </h2>
                        <div className="bg-card border border-border rounded-xl divide-y divide-border shadow-sm">
                            <div className="p-4 flex flex-col gap-4">
                                <div className="space-y-0.5">
                                    <h3 className="font-medium text-sm">Color Theme</h3>
                                    <p className="text-xs text-muted-foreground">Customize your dashboard aesthetic</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setTheme('light')}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${!isDarkMode ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-secondary/20 hover:border-muted-foreground/50'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                                            <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                                        </div>
                                        <span className="text-xs font-semibold">Light Mode</span>
                                    </button>
                                    <button 
                                        onClick={() => setTheme('dark')}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${isDarkMode ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-secondary/20 hover:border-muted-foreground/50'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 shadow-sm flex items-center justify-center">
                                            <span className="w-4 h-4 rounded-full bg-purple-500"></span>
                                        </div>
                                        <span className="text-xs font-semibold">Dark Mode</span>
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                 <div className="space-y-0.5">
                                    <h3 className="font-medium text-sm">Compact UI</h3>
                                    <p className="text-xs text-muted-foreground">Reduce padding across the application</p>
                                </div>
                                <button className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-secondary transition-colors ">
                                    <span className="translate-x-0 inline-block h-4 w-4 transform rounded-full bg-muted-foreground transition-transform"></span>
                                </button>
                            </div>
                        </div>
                    </section>
                    
                    {/* Wallet Settings */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Blockchain
                        </h2>
                        <div className="bg-card border border-border rounded-xl divide-y divide-border shadow-sm">
                            <div className="p-4 flex flex-col gap-3">
                                <div className="space-y-1">
                                    <h3 className="font-medium text-sm">Solana RPC Endpoint</h3>
                                    <p className="text-xs text-muted-foreground">Custom node URL for on-chain transactions</p>
                                </div>
                                <input 
                                    className="w-full px-3 py-2 bg-secondary/50 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    defaultValue="https://api.mainnet-beta.solana.com"
                                />
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                 <div className="space-y-0.5">
                                    <h3 className="font-medium text-sm">Auto-Approve Transactions</h3>
                                    <p className="text-xs text-muted-foreground">Skip confirmation for low value trades</p>
                                </div>
                                <button className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                                    <span className="translate-x-4 inline-block h-4 w-4 transform rounded-full bg-background transition-transform"></span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Security */}
                     <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Danger Zone
                        </h2>
                        <div className="bg-card border border-red-500/20 rounded-xl divide-y divide-border shadow-sm">
                            <div className="p-4 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="font-medium text-sm text-red-500">Clear Storage</h3>
                                    <p className="text-xs text-muted-foreground">Wipe local session tokens & cache</p>
                                </div>
                                <button className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-md transition-colors">
                                    Purge Data
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Column 2 */}
                 <div className="space-y-8">
                    

                    {/* AI Configuration */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            AI Models
                        </h2>
                        <div className="bg-card border border-border rounded-xl divide-y divide-border shadow-sm">
                            <div className="p-4 flex flex-col gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-sm">Configured Providers</h3>
                                        <button 
                                            onClick={() => setIsAddingProvider(true)}
                                            className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 font-medium"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add New
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Select the primary model for general reasoning</p>
                                </div>
                                <div className="space-y-2 mt-2">
                                    {loadingProviders ? (
                                        <div className="flex items-center justify-center p-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : providers.length === 0 ? (
                                        <div className="text-sm text-muted-foreground text-center p-4 border border-dashed border-border rounded-lg">
                                            No providers configured. Use the CLI to add them.
                                        </div>
                                    ) : (
                                        providers.map((p) => (
                                            <div 
                                                key={p.id} 
                                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${p.is_primary === 1 ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'}`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{p.name} {p.is_primary === 1 && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Primary</span>}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{p.model}</span>
                                                </div>
                                                {p.is_primary !== 1 && (
                                                    <button 
                                                        onClick={() => handleSetPrimary(p.id)}
                                                        disabled={settingPrimary !== null}
                                                        className="text-xs px-2.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded transition-colors disabled:opacity-50"
                                                    >
                                                        {settingPrimary === p.id ? 'Setting...' : 'Set Active'}
                                                    </button>
                                                )}
                                                {p.is_primary === 1 && (
                                                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                                        <Check className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                    
                     

                 </div>
            </div>

             {/* Add Provider Modal */}
             {isAddingProvider && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h3 className="text-lg font-semibold">Add AI Provider</h3>
                            <button onClick={() => setIsAddingProvider(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Provider</label>
                                <select 
                                    value={newProvider}
                                    onChange={(e) => {
                                        setNewProvider(e.target.value);
                                        setAvailableModels([]);
                                    }}
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="groq">Groq</option>
                                    <option value="google">Google Gemini</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">API Key</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="password"
                                        value={newApiKey}
                                        onChange={(e) => setNewApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="flex-1 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button 
                                        onClick={handleFetchModels}
                                        disabled={loadingModels || !newApiKey.trim()}
                                        className="px-3 py-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {loadingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch Models'}
                                    </button>
                                </div>
                            </div>
                            
                            {availableModels.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-border">
                                    <label className="text-sm font-medium">Select Model</label>
                                    <select 
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {availableModels.map(m => (
                                            <option key={m.id} value={m.id}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-secondary/20">
                            <button 
                                onClick={() => setIsAddingProvider(false)}
                                className="px-4 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors border border-border"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddProvider}
                                disabled={!selectedModel}
                                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Save Provider
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
