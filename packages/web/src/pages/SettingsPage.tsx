import { AlertCircle, Brain, Check, ChevronDown, Globe, Key, Loader2, Monitor, Palette, Plus, Shield, Trash2, Wallet, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ApiClient } from '../lib/api';

export interface AIProvider {
    id: number;
    name: string;
    model: string;
    is_primary: number;
}

type SettingsTab = 'system' | 'appearance' | 'blockchain' | 'guardrails' | 'providers';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'system', label: 'System Info', icon: <Monitor className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'blockchain', label: 'Blockchain', icon: <Globe className="w-4 h-4" /> },
    { id: 'guardrails', label: 'Guardrails', icon: <Shield className="w-4 h-4" /> },
    { id: 'providers', label: 'Providers', icon: <Brain className="w-4 h-4" /> },
];

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { id: string; label: string }[];
    label?: string;
    position?: 'top' | 'bottom';
}

function CustomSelect({ value, onChange, options, label, position = 'bottom' }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.id === value);

    // Stop scroll propagation to prevent modal from scrolling when dropdown is scrolled
    const handleScroll = (e: React.WheelEvent | React.TouchEvent) => {
        e.stopPropagation();
    };

    const isTop = position === 'top';

    return (
        <div className="space-y-2 relative">
            {label && <label className="text-sm font-medium">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-background border border-input rounded-md hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 text-left"
            >
                <span className="text-sm truncate">{selectedOption?.label || 'Select option...'}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div 
                        onWheel={handleScroll}
                        onTouchMove={handleScroll}
                        className={`absolute ${isTop ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top'} left-0 right-0 z-50 bg-card border border-border rounded-md shadow-xl overflow-y-auto max-h-60 animate-in fade-in ${isTop ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} duration-200`}
                    >
                        <div className="p-1">
                            {options.map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center text-left px-3 py-2 text-sm rounded-sm transition-colors ${
                                        value === option.id 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'hover:bg-secondary text-foreground'
                                    }`}
                                >
                                    <span className="truncate">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

const PROVIDER_OPTIONS = [
    { id: 'openai', label: 'OpenAI' },
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'groq', label: 'Groq' },
    { id: 'google', label: 'Google Gemini' },
    { id: 'custom', label: 'Custom (Ollama, OpenRouter, etc.)' },
];

const COMPAT_OPTIONS = [
    { id: 'openai', label: 'OpenAI Compatible' },
    { id: 'anthropic', label: 'Anthropic Compatible' },
];

function BlockchainSettings() {
    const [rpcUrl, setRpcUrl] = useState('https://api.devnet.solana.com');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            const token = localStorage.getItem('sigil_token');
            if (!token) { setLoadingConfig(false); return; }
            try {
                const client = new ApiClient(token);
                const res = await client.getConfig();
                if (res.data?.rpc_url) setRpcUrl(res.data.rpc_url);
            } catch (e) { console.error('Failed to load config:', e); }
            finally { setLoadingConfig(false); }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        const token = localStorage.getItem('sigil_token');
        if (!token) return;
        setIsSaving(true);
        try {
            const client = new ApiClient(token);
            await client.setConfig({ rpc_url: rpcUrl });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { console.error('Failed to save RPC URL:', e); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <section className="space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Blockchain
                </h2>
                <div className="bg-card border border-border rounded-xl divide-y divide-border shadow-sm">
                    <div className="p-4 flex flex-col gap-3">
                        <div className="space-y-1">
                            <h3 className="font-medium text-sm">Solana RPC Endpoint</h3>
                            <p className="text-xs text-muted-foreground">Custom node URL for on-chain transactions (Devnet only)</p>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 px-3 py-2 bg-secondary/50 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                value={loadingConfig ? '' : rpcUrl}
                                onChange={(e) => setRpcUrl(e.target.value)}
                                placeholder={loadingConfig ? 'Loading...' : 'https://api.devnet.solana.com'}
                                disabled={loadingConfig}
                            />
                            <button
                                onClick={handleSave}
                                disabled={isSaving || loadingConfig}
                                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saved ? <><Check className="w-4 h-4" /> Saved</> : isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

const GUARDRAIL_DEFAULTS = {
    kill_switch: false,
    per_trade_limit: 5,
    daily_volume_cap: 10,
    slippage_cap: 1,
    cooldown_period: 30,
    confirmation_threshold: 50,
    allowlist: [] as string[],
};

function GuardrailSettings() {
    const [config, setConfig] = useState<any>(GUARDRAIL_DEFAULTS);
    const [originalConfig, setOriginalConfig] = useState<any>(GUARDRAIL_DEFAULTS);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [newAddress, setNewAddress] = useState('');
    const [addressError, setAddressError] = useState<string | null>(null);

    const fetchConfig = useCallback(async () => {
        const token = localStorage.getItem('sigil_token');
        if (!token) { setLoading(false); return; }
        try {
            const client = new ApiClient(token);
            const res = await client.getConfig();
            if (res.data) {
                let parsedAllowlist: string[] = [];
                try {
                    parsedAllowlist = res.data.allowlist ? JSON.parse(res.data.allowlist) : [];
                } catch { parsedAllowlist = []; }

                const fetched = {
                    kill_switch: res.data.kill_switch === 'true',
                    per_trade_limit: parseFloat(res.data.per_trade_limit || '5'),
                    daily_volume_cap: parseFloat(res.data.daily_volume_cap || '10'),
                    slippage_cap: parseFloat(res.data.slippage_cap || '1'),
                    cooldown_period: parseInt(res.data.cooldown_period || '30', 10),
                    confirmation_threshold: parseFloat(res.data.confirmation_threshold || '50'),
                    allowlist: parsedAllowlist,
                };
                setConfig(fetched);
                setOriginalConfig(fetched);
            }
        } catch (e) { console.error('Failed to load config:', e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleSave = async () => {
        const token = localStorage.getItem('sigil_token');
        if (!token) return;
        setIsSaving(true);
        try {
            const client = new ApiClient(token);
            const { allowlist, ...rest } = config;
            await client.setConfig({ ...rest, allowlist: JSON.stringify(allowlist) });
            setOriginalConfig(config);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { console.error('Failed to save guardrails:', e); }
        finally { setIsSaving(false); }
    };

    const handleAddAddress = () => {
        const addr = newAddress.trim();
        if (!addr) return;
        if (addr.length < 32 || addr.length > 44) {
            setAddressError('Invalid Solana address (must be 32-44 characters)');
            return;
        }
        if (config.allowlist.includes(addr)) {
            setAddressError('Address already in allowlist');
            return;
        }
        setConfig({ ...config, allowlist: [...config.allowlist, addr] });
        setNewAddress('');
        setAddressError(null);
    };

    const handleRemoveAddress = (addr: string) => {
        setConfig({ ...config, allowlist: config.allowlist.filter((a: string) => a !== addr) });
    };

    const handleResetDefaults = () => {
        setConfig(GUARDRAIL_DEFAULTS);
    };

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <section className="space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Security Guardrails
                </h2>
                <div className="bg-card border border-border rounded-xl divide-y divide-border shadow-sm overflow-hidden">
                    {/* KILL SWITCH */}
                    <div className="p-4 flex items-center justify-between bg-red-500/5">
                        <div className="space-y-0.5">
                            <h3 className="font-semibold text-sm text-red-500">Global Kill Switch</h3>
                            <p className="text-xs text-muted-foreground">Immediately halt all transaction signing across all agents.</p>
                        </div>
                        <button
                            onClick={() => setConfig({...config, kill_switch: !config.kill_switch})}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.kill_switch ? 'bg-red-500' : 'bg-secondary'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.kill_switch ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* PER TRADE LIMIT */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h3 className="font-medium text-sm">Per-Trade Limit</h3>
                            <p className="text-xs text-muted-foreground">Maximum SOL value per trade.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={config.per_trade_limit}
                                onChange={(e) => setConfig({...config, per_trade_limit: parseFloat(e.target.value)})}
                                className="w-20 px-2 py-1 bg-secondary border border-border rounded text-sm font-mono text-right"
                            />
                            <span className="text-xs text-muted-foreground font-bold">SOL</span>
                        </div>
                    </div>

                    {/* DAILY VOLUME CAP */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h3 className="font-medium text-sm">Daily Volume Cap</h3>
                            <p className="text-xs text-muted-foreground">Total SOL volume allowed per 24h window.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={config.daily_volume_cap}
                                onChange={(e) => setConfig({...config, daily_volume_cap: parseFloat(e.target.value)})}
                                className="w-20 px-2 py-1 bg-secondary border border-border rounded text-sm font-mono text-right"
                            />
                            <span className="text-xs text-muted-foreground font-bold">SOL</span>
                        </div>
                    </div>

                    {/* SLIPPAGE CAP */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h3 className="font-medium text-sm">Slippage Cap</h3>
                            <p className="text-xs text-muted-foreground">Maximum slippage % allowed for DEX swaps.</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={config.slippage_cap}
                                onChange={(e) => setConfig({...config, slippage_cap: parseFloat(e.target.value)})}
                                className="w-20 px-2 py-1 bg-secondary border border-border rounded text-sm font-mono text-right"
                            />
                            <span className="text-xs text-muted-foreground font-bold">%</span>
                        </div>
                    </div>

                    {/* COOLDOWN */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h3 className="font-medium text-sm">Cooldown Period</h3>
                            <p className="text-xs text-muted-foreground">Minimum seconds between transactions.</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={config.cooldown_period}
                                onChange={(e) => setConfig({...config, cooldown_period: parseInt(e.target.value, 10)})}
                                className="w-20 px-2 py-1 bg-secondary border border-border rounded text-sm font-mono text-right"
                            />
                            <span className="text-xs text-muted-foreground font-bold">SEC</span>
                        </div>
                    </div>

                    {/* CONFIRMATION THRESHOLD */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h3 className="font-medium text-sm">Confirmation Threshold</h3>
                            <p className="text-xs text-muted-foreground">Trades above this SOL value require manual signing.</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={config.confirmation_threshold}
                                onChange={(e) => setConfig({...config, confirmation_threshold: parseFloat(e.target.value)})}
                                className="w-20 px-2 py-1 bg-secondary border border-border rounded text-sm font-mono text-right"
                            />
                            <span className="text-xs text-muted-foreground font-bold">SOL</span>
                        </div>
                    </div>

                    {/* ALLOWLIST */}
                    <div className="p-4 space-y-3">
                        <div className="space-y-0.5">
                            <h3 className="font-medium text-sm">Recipient Allowlist</h3>
                            <p className="text-xs text-muted-foreground">Only allow transfers to these addresses. Leave empty to allow all.</p>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                value={newAddress}
                                onChange={(e) => { setNewAddress(e.target.value); setAddressError(null); }}
                                placeholder="Solana address (base58)"
                                className="flex-1 px-3 py-2 bg-secondary/50 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddAddress()}
                            />
                            <button
                                onClick={handleAddAddress}
                                className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>
                        {addressError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {addressError}
                            </p>
                        )}
                        {config.allowlist.length > 0 ? (
                            <div className="space-y-1.5 mt-2">
                                {config.allowlist.map((addr: string) => (
                                    <div key={addr} className="flex items-center justify-between px-3 py-2 bg-secondary/30 border border-border rounded-md group">
                                        <code className="text-xs font-mono text-muted-foreground truncate mr-2">{addr}</code>
                                        <button
                                            onClick={() => handleRemoveAddress(addr)}
                                            className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No addresses — all recipients allowed.</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                    <button
                        onClick={handleResetDefaults}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                    >
                        Reset to Project Defaults
                    </button>
                    
                    <div className="flex items-center gap-3">
                        {hasChanges && (
                            <button
                                onClick={() => setConfig(originalConfig)}
                                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md transition-colors"
                            >
                                Discard
                            </button>
                        )}
                        <button
                            disabled={!hasChanges || isSaving}
                            onClick={handleSave}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saved ? <><Check className="w-4 h-4" /> Changes Saved</> : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {saved && (
                    <div className="flex items-center gap-2 text-green-500 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
                        <Check className="w-3.5 h-3.5" /> Settings Saved & Enforced
                    </div>
                )}
            </section>
        </div>
    );
}

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('system');
    const [providers, setProviders] = useState<AIProvider[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [settingPrimary, setSettingPrimary] = useState<number | null>(null);
    const [deletingProvider, setDeletingProvider] = useState<AIProvider | null>(null);

    // Add Provider State
    const [isAddingProvider, setIsAddingProvider] = useState(false);
    const [newProvider, setNewProvider] = useState('openai');
    const [customName, setCustomName] = useState('');
    const [newApiKey, setNewApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [compat, setCompat] = useState<'openai' | 'anthropic'>('openai');
    const [availableModels, setAvailableModels] = useState<{ id: string; label: string }[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [selectedModel, setSelectedModel] = useState('');
    const [providerError, setProviderError] = useState<string | null>(null);

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
            const providerName = newProvider === 'custom' ? customName || 'custom' : newProvider;
            const response = await client.fetchModels(providerName, newApiKey, baseUrl || undefined);

            if (response.data && response.data.error) {
                setProviderError(response.data.error);
                setAvailableModels([]);
            } else if (response.data && response.data.models) {
                setAvailableModels(response.data.models);
                setProviderError(null);
                if (response.data.models.length > 0) {
                    setSelectedModel(response.data.models[0].id);
                }
            }
        } catch (e: any) {
            console.error('Failed to fetch models', e);
            setProviderError(e.message || 'Failed to fetch models. Check API key and provider.');
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
            const providerName = newProvider === 'custom' ? customName : newProvider;
            await client.addProvider(providerName, newApiKey, selectedModel, baseUrl || undefined, compat);
            setIsAddingProvider(false);
            setNewApiKey('');
            setBaseUrl('');
            setCustomName('');
            setAvailableModels([]);
            setProviderError(null);
            fetchProviders();
        } catch (e: any) {
            console.error('Failed to add provider', e);
            setProviderError(e.error || e.message || 'Failed to add provider');
        }
    };

    const handleDeleteProvider = async () => {
        if (!deletingProvider) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;
        try {
            const client = new ApiClient(token);
            await client.deleteProvider(deletingProvider.id);
            await fetchProviders();
        } catch (e) {
            console.error('Failed to delete provider', e);
        } finally {
            setDeletingProvider(null);
        }
    };

    return (
        <div className="flex flex-col space-y-6 overflow-y-auto pr-2">
            <header className="flex flex-col space-y-2 shrink-0">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage system, appearance, blockchain, and AI provider configurations.</p>
            </header>

            {/* Tab Bar */}
            <div className="flex space-x-1 p-1 bg-secondary/50 rounded-lg mb-6 w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === tab.id
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto space-y-6">

                {/* System Info Tab */}
                {activeTab === 'system' && (
                    <div className="space-y-6 max-w-2xl">
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
                            </div>
                        </section>

                        {/* Danger Zone */}
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
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                    <div className="space-y-6 max-w-2xl">
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
                            </div>
                        </section>
                    </div>
                )}

                {/* Blockchain Tab */}
                {activeTab === 'blockchain' && (
                    <BlockchainSettings />
                )}

                {/* Guardrails Tab */}
                {activeTab === 'guardrails' && (
                    <GuardrailSettings />
                )}

                {/* Providers Tab */}
                {activeTab === 'providers' && (
                    <div className="space-y-6 max-w-2xl">
                        <section className="space-y-4">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Brain className="w-4 h-4" />
                                AI Providers
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
                                                    <div className="flex items-center gap-2">
                                                        {p.is_primary !== 1 && (
                                                            <button 
                                                                onClick={() => handleSetPrimary(p.id)}
                                                                disabled={settingPrimary !== null}
                                                                className="text-xs px-2.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded transition-colors disabled:opacity-50"
                                                            >
                                                                {settingPrimary === p.id ? 'Setting...' : 'Set Primary'}
                                                            </button>
                                                        )}
                                                        {p.is_primary === 1 && (
                                                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => setDeletingProvider(p)}
                                                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                            title="Remove provider"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
             {/* Add Provider Modal */}
             {isAddingProvider && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h3 className="text-lg font-semibold">Add AI Provider</h3>
                            <button onClick={() => {
                                setIsAddingProvider(false);
                                setProviderError(null);
                            }} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto">
                            {providerError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <p className="text-xs font-medium leading-relaxed">{providerError}</p>
                                </div>
                            )}
                            
                            <CustomSelect 
                                label="Provider Type"
                                value={newProvider}
                                onChange={(val) => {
                                    setNewProvider(val);
                                    setAvailableModels([]);
                                }}
                                options={PROVIDER_OPTIONS}
                            />

                            {newProvider === 'custom' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Custom Name</label>
                                        <input 
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            placeholder="e.g. MyLocalOllama"
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            Base URL
                                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded uppercase font-bold">Local or Proxy</span>
                                        </label>
                                        <input 
                                            value={baseUrl}
                                            onChange={(e) => setBaseUrl(e.target.value)}
                                            placeholder="http://localhost:11434"
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <CustomSelect 
                                        label="API Compatibility"
                                        value={compat}
                                        onChange={(val) => setCompat(val as 'openai' | 'anthropic')}
                                        options={COMPAT_OPTIONS}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">API Key</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="password"
                                            value={newApiKey}
                                            onChange={(e) => {
                                                setNewApiKey(e.target.value);
                                                if (providerError) setProviderError(null);
                                            }}
                                            placeholder={newProvider === 'custom' ? 'Optional for local' : 'sk-...'}
                                            className="w-full pl-3 pr-12 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                        <Key className="absolute right-3.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/30" />
                                    </div>
                                    <button 
                                        onClick={handleFetchModels}
                                        disabled={loadingModels || (!newApiKey.trim() && newProvider !== 'custom' && !baseUrl)}
                                        className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loadingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                                        Fetch
                                    </button>
                                </div>
                            </div>
                            
                            {availableModels.length > 0 && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <CustomSelect 
                                        label="Select Model"
                                        value={selectedModel}
                                        onChange={setSelectedModel}
                                        options={availableModels}
                                        position="bottom"
                                    />
                                </div>
                            )}

                            {/* Spacer to allow scrolling past the bottom dropdown */}
                            <div className="h-32" />
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-secondary/10 shrink-0">
                            <button 
                                onClick={() => {
                                    setIsAddingProvider(false);
                                    setProviderError(null);
                                }}
                                className="px-4 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors border border-border"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddProvider}
                                disabled={!selectedModel || (newProvider === 'custom' && !customName)}
                                className="px-5 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loadingProviders ? 'Adding...' : 'Save Provider'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Provider Confirmation Modal */}
            {deletingProvider && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Remove Provider</h3>
                                    <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to remove <span className="font-semibold text-foreground">{deletingProvider.name}</span> ({deletingProvider.model})?
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-secondary/20">
                            <button
                                onClick={() => setDeletingProvider(null)}
                                className="px-4 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors border border-border"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteProvider}
                                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 text-sm font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
