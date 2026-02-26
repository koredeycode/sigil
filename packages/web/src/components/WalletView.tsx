import { Activity, ArrowRightLeft, Check, Coins, Copy, Loader2, PieChart as PieChartIcon, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { ApiClient } from '../lib/api';
import { PortfolioChart } from './PortfolioChart';
import { TransactionLedger } from './TransactionLedger';

import type { Agent } from '../hooks/useAgents';

interface TokenAccount {
    address: string;
    mint: string;
    balance: number;
    decimals: number;
    symbol?: string;
}

interface WalletData {
    sol: number;
    solLamports: number;
    tokens: TokenAccount[];
    pubkey: string;
}

export function WalletView({ activeAgent }: { activeAgent: Agent | null }) {
    const { socket } = useSocket();
    const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions'>('portfolio');
    const [showChart, setShowChart] = useState(false);
    const [copied, setCopied] = useState(false);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const truncatedAddress = activeAgent?.pubkey
        ? `${activeAgent.pubkey.slice(0, 4)}...${activeAgent.pubkey.slice(-4)}`
        : '';

    const handleCopyAddress = () => {
        if (!activeAgent?.pubkey) return;
        navigator.clipboard.writeText(activeAgent.pubkey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Fetch wallet data from devnet
    const fetchWalletData = useCallback(async () => {
        if (!activeAgent) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setLoading(true);
        setError(null);
        try {
            const client = new ApiClient(token);
            const res = await client.getWalletBalance(activeAgent.id);
            if (res.data) {
                setWallet(res.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch wallet data');
        } finally {
            setLoading(false);
        }
    }, [activeAgent]);

    // Fetch on agent change
    useEffect(() => {
        fetchWalletData();
    }, [fetchWalletData]);

    // Listen for real-time wallet updates
    useEffect(() => {
        if (!socket || !activeAgent) return;

        // Subscribe to wallet updates
        socket.emit('wallet:subscribe', { agentId: activeAgent.id });

        const handleWalletUpdate = (data: { agentId: string; balance: number }) => {
            if (data.agentId === activeAgent.id) {
                setWallet(prev => prev ? { ...prev, sol: data.balance } : null);
            }
        };

        socket.on('wallet:update', handleWalletUpdate);

        return () => {
            socket.emit('wallet:unsubscribe', { agentId: activeAgent.id });
            socket.off('wallet:update', handleWalletUpdate);
        };
    }, [socket, activeAgent]);

    // Token icon colors by position
    const tokenColors = ['bg-purple-600', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-600', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500'];

    return (
        <div className="flex flex-col h-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Header section with Account Value & Action Buttons */}
            <div className="p-6 pb-2 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold tracking-tight">Portfolio</h2>
                        <button
                            onClick={fetchWalletData}
                            className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {/* Tab Switcher */}
                    <div className="flex space-x-1 p-1 bg-secondary rounded-lg">
                        <button
                            onClick={() => setActiveTab('portfolio')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                activeTab === 'portfolio'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                            <Coins className="w-3.5 h-3.5" />
                            Assets
                        </button>
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                activeTab === 'transactions'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                            <Activity className="w-3.5 h-3.5" />
                            Activity
                        </button>
                    </div>
                </div>
                {activeAgent && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/40 border border-border/60 w-fit">
                        <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary">{activeAgent.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground">{activeAgent.name}</span>
                        <span className="w-px h-3 bg-border"></span>
                        <code className="text-[11px] font-mono text-muted-foreground">{truncatedAddress}</code>
                        <button
                            onClick={handleCopyAddress}
                            className="p-1 -mr-1 rounded-full hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy wallet address"
                        >
                            {copied
                                ? <Check className="w-3 h-3 text-green-500" />
                                : <Copy className="w-3 h-3" />
                            }
                        </button>
                    </div>
                )}

                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Account Value</p>
                    {loading && !wallet ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            <span className="text-muted-foreground text-sm">Loading...</span>
                        </div>
                    ) : error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : (
                        <h1 className="text-4xl font-black tracking-tight">
                            {wallet ? `${wallet.sol.toFixed(4)} SOL` : '—'}
                        </h1>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto pt-4 relative">
                <div className={`h-full flex flex-col ${activeTab === 'portfolio' ? 'block' : 'hidden'}`}>
                    
                    <div className="px-6 flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Balances</h3>
                        <div className="flex bg-secondary/50 rounded-md p-0.5">
                            <button 
                                onClick={() => setShowChart(false)}
                                className={`p-1.5 rounded transition-colors ${!showChart ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setShowChart(true)}
                                className={`p-1.5 rounded transition-colors ${showChart ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <PieChartIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 space-y-4 pb-6 mt-2">
                        {showChart ? (
                            <div className="mt-4 border border-border rounded-xl overflow-hidden">
                                <PortfolioChart activeAgent={activeAgent} />
                            </div>
                        ) : loading && !wallet ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Fetching from devnet...</p>
                            </div>
                        ) : (
                            <>
                                {/* SOL Balance */}
                                <div className="flex items-center justify-between hover:bg-secondary/40 p-2 -mx-2 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-purple-500 to-blue-500">
                                            S
                                        </div>
                                        <div className="space-y-0.5">
                                            <h3 className="font-semibold leading-none">Solana</h3>
                                            <p className="text-xs text-muted-foreground uppercase">SOL</p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-0.5">
                                        <h3 className="font-semibold leading-none">{wallet?.sol.toFixed(4) ?? '0'} SOL</h3>
                                        <p className="text-xs text-muted-foreground">Devnet</p>
                                    </div>
                                </div>

                                {/* SPL Token Accounts */}
                                {wallet?.tokens?.map((token, idx) => (
                                    <div key={token.address} className="flex items-center justify-between hover:bg-secondary/40 p-2 -mx-2 rounded-lg cursor-pointer transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${tokenColors[idx % tokenColors.length]}`}>
                                                {token.mint.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="space-y-0.5">
                                                <h3 className="font-semibold leading-none font-mono text-sm">
                                                    {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">SPL Token</p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <h3 className="font-semibold leading-none">{token.balance}</h3>
                                            <p className="text-xs text-muted-foreground">Decimals: {token.decimals}</p>
                                        </div>
                                    </div>
                                ))}

                                {wallet?.tokens?.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">No SPL token accounts</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className={`h-full ${activeTab === 'transactions' ? 'flex flex-col' : 'hidden'}`}>
                    <TransactionLedger activeAgent={activeAgent} />
                </div>
                
                {/* Fade out gradient at bottom of assets list */}
                {activeTab === 'portfolio' && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                )}
            </div>
        </div>
    );
}
