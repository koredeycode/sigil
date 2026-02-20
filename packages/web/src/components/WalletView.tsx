import { Activity, ArrowRightLeft, Coins, PieChart as PieChartIcon } from 'lucide-react';
import { useState } from 'react';
import { PortfolioChart } from './PortfolioChart';
import { TransactionLedger } from './TransactionLedger';

// Mock asset data to match the screenshot style
const MOCK_ASSETS = [
    { name: 'Solana', symbol: 'SOL', balance: '56.42', fiat: '$8,329.90', icon: 'bg-purple-600' },
    { name: 'Jupiter', symbol: 'JUP', balance: '1,250.00', fiat: '$1,400.00', icon: 'bg-green-500' },
    { name: 'Bonk', symbol: 'BONK', balance: '45,000,000', fiat: '$950.25', icon: 'bg-orange-500' },
    { name: 'dogwifhat', symbol: 'WIF', balance: '240.5', fiat: '$780.00', icon: 'bg-pink-500' },
    { name: 'USD Coin', symbol: 'USDC', balance: '374.41', fiat: '$374.41', icon: 'bg-blue-600' },
];

import type { Agent } from '../hooks/useAgents';

export function WalletView({ activeAgent }: { activeAgent: Agent | null }) {
    const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions'>('portfolio');
    const [showChart, setShowChart] = useState(false);

    return (
        <div className="flex flex-col h-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Header section with Account Value & Action Buttons */}
            <div className="p-6 pb-2 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Portfolio</h2>
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

                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Account Value</p>
                    <h1 className="text-4xl font-black tracking-tight">$11,834.56</h1>
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
                        ) : (
                            MOCK_ASSETS.map((asset) => (
                                <div key={asset.symbol} className="flex items-center justify-between hover:bg-secondary/40 p-2 -mx-2 rounded-lg cursor-pointer transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${asset.icon}`}>
                                            {asset.symbol[0]}
                                        </div>
                                        <div className="space-y-0.5">
                                            <h3 className="font-semibold leading-none">{asset.name}</h3>
                                            <p className="text-xs text-muted-foreground uppercase">{asset.symbol}</p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-0.5">
                                        <h3 className="font-semibold leading-none">{asset.balance} {asset.symbol}</h3>
                                        <p className="text-xs text-muted-foreground">{asset.fiat}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className={`h-full ${activeTab === 'transactions' ? 'flex flex-col' : 'hidden'}`}>
                    {/* The TransactionLedger component will render its own content */}
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
