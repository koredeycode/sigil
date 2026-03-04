import { clsx } from 'clsx';
import { ArrowUpRight, ExternalLink, Eye, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { useSocket } from '../hooks/useSocket';
import { ApiClient } from '../lib/api';

interface TransactionLedgerProps {
    activeAgent: Agent | null;
}

interface OnChainTransaction {
    signature: string;
    blockTime: string | null;
    slot: number;
    status: string;
    err: any;
    memo: string | null;
}

export function TransactionLedger({ activeAgent, onSelectTx }: TransactionLedgerProps & { onSelectTx: (sig: string) => void }) {
    const { socket } = useSocket();
    const [transactions, setTransactions] = useState<OnChainTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch real on-chain transactions from devnet
    useEffect(() => {
        if (!activeAgent) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setLoading(true);
        const client = new ApiClient(token);
        client.getWalletTransactions(activeAgent.id, 30)
            .then(res => setTransactions(res.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeAgent]);

    // Listen for new transactions via socket
    useEffect(() => {
        if (!socket || !activeAgent) return;

        const handleWalletUpdate = () => {
            // Re-fetch transactions on wallet update
            const token = localStorage.getItem('sigil_token');
            if (!token) return;
            const client = new ApiClient(token);
            client.getWalletTransactions(activeAgent.id, 30)
                .then(res => setTransactions(res.data || []))
                .catch(console.error);
        };

        socket.on('wallet:update', handleWalletUpdate);
        socket.on('agent:transaction', handleWalletUpdate);

        return () => {
            socket.off('wallet:update', handleWalletUpdate);
            socket.off('agent:transaction', handleWalletUpdate);
        };
    }, [socket, activeAgent]);

    const formatTime = (isoString: string | null): string => {
        if (!isoString) return '—';
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMin < 1) return 'Just now';
            if (diffMin < 60) return `${diffMin}m ago`;
            if (diffHrs < 24) return `${diffHrs}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        } catch {
            return '—';
        }
    };

    if (!activeAgent) return <div className="p-4 text-muted-foreground text-sm">Select an agent</div>;
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Fetching from devnet...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                        <tr>
                            <th className="px-4 py-2 font-medium w-[50px]"></th>
                            <th className="px-4 py-2 font-medium">Signature</th>
                            <th className="px-4 py-2 font-medium">Time</th>
                            <th className="px-4 py-2 font-medium">Status</th>
                            <th className="px-4 py-2 font-medium w-[60px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {transactions.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No on-chain transactions found</td></tr>
                        ) : (
                            transactions.map((tx) => (
                                <tr key={tx.signature} className="hover:bg-secondary/10 transition-colors">
                                    <td className="px-4 py-2">
                                        <div className="p-1.5 bg-secondary rounded w-fit">
                                            <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-1">
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {tx.signature.slice(0, 8)}...{tx.signature.slice(-4)}
                                            </span>
                                            <a
                                                href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3 cursor-pointer" />
                                            </a>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-xs text-muted-foreground">
                                        {formatTime(tx.blockTime)}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={clsx(
                                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                            tx.err ? "bg-red-500/10 text-red-500" :
                                            tx.status === 'finalized' ? "bg-green-500/10 text-green-500" :
                                            "bg-yellow-500/10 text-yellow-500"
                                        )}>
                                            {tx.err ? 'failed' : tx.status || 'confirmed'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <button
                                            onClick={() => onSelectTx(tx.signature)}
                                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                            title="View details"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Transaction Detail Modal will be rendered by parent WalletView */}
        </div>
    );
}
