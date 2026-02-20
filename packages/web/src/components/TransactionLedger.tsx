import { clsx } from 'clsx';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Agent } from '../hooks/useAgents';
import { ApiClient } from '../lib/api';

interface TransactionLedgerProps {
    activeAgent: Agent | null;
}

export function TransactionLedger({ activeAgent }: TransactionLedgerProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!activeAgent) return;
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        setLoading(true);
        const client = new ApiClient(token);
        client.getTransactions(activeAgent.id)
            .then(setTransactions)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeAgent]);

    if (!activeAgent) return <div className="p-4 text-muted-foreground text-sm">Select an agent</div>;
    if (loading) return <div className="p-4 text-muted-foreground text-sm">Loading transactions...</div>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                    <tr>
                        <th className="px-4 py-2 font-medium w-[80px]">Type</th>
                        <th className="px-4 py-2 font-medium">Signature</th>
                        <th className="px-4 py-2 font-medium">Amount</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {transactions.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs">No transactions recorded</td></tr>
                    ) : (
                        transactions.map((tx: any) => (
                            <tr key={tx.signature} className="hover:bg-secondary/10 transition-colors">
                                <td className="px-4 py-2">
                                     {/* Mock Type Icon */}
                                    <div className="p-1.5 bg-secondary rounded w-fit">
                                        <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                </td>
                                <td className="px-4 py-2">
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-xs text-muted-foreground">{tx.signature.slice(0, 8)}...</span>
                                        <ExternalLink className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-primary" />
                                    </div>
                                </td>
                                <td className="px-4 py-2 font-mono text-xs">
                                     {tx.amount || '0.00'} SOL
                                </td>
                                <td className="px-4 py-2">
                                    <span className={clsx(
                                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                        tx.status === 'confirmed' ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                                    )}>
                                        {tx.status}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
