import { ExternalLink, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiClient } from '../lib/api';

interface TransactionDetailModalProps {
    agentId: string;
    signature: string;
    onClose: () => void;
}

interface TransactionDetail {
    signature: string;
    slot: number;
    blockTime: string | null;
    fee: number;
    status: string;
    error: string | null;
    instructions: Array<{ programId: string; program: string | null; parsed: any }>;
    preBalances: number[];
    postBalances: number[];
    logMessages: string[] | null;
}

export function TransactionDetailModal({ agentId, signature, onClose }: TransactionDetailModalProps) {
    const [detail, setDetail] = useState<TransactionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('sigil_token');
        if (!token) return;

        const client = new ApiClient(token);
        client.getTransactionDetail(agentId, signature)
            .then(res => {
                if (res.data) setDetail(res.data);
            })
            .catch(err => setError(err.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }, [agentId, signature]);

    return (
        <div className="absolute inset-0 z-10 flex flex-col bg-background/95 backdrop-blur-sm" onClick={onClose}>
            <div
                className="flex flex-col h-full w-full max-h-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div>
                        <h2 className="text-lg font-bold">Transaction Details</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs font-mono text-muted-foreground">
                                {signature.slice(0, 16)}...{signature.slice(-8)}
                            </code>
                            <a
                                href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Fetching from devnet...</p>
                        </div>
                    ) : error ? (
                        <p className="text-sm text-destructive text-center py-8">{error}</p>
                    ) : detail ? (
                        <>
                            {/* Overview Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-secondary/30 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Status</p>
                                    <span className={`text-sm font-semibold ${detail.status === 'confirmed' ? 'text-green-500' : 'text-red-500'}`}>
                                        {detail.status}
                                    </span>
                                </div>
                                <div className="p-3 bg-secondary/30 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Fee</p>
                                    <span className="text-sm font-semibold">{detail.fee.toFixed(6)} SOL</span>
                                </div>
                                <div className="p-3 bg-secondary/30 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Slot</p>
                                    <span className="text-sm font-semibold font-mono">{detail.slot.toLocaleString()}</span>
                                </div>
                                <div className="p-3 bg-secondary/30 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Block Time</p>
                                    <span className="text-sm font-semibold">
                                        {detail.blockTime ? new Date(detail.blockTime).toLocaleString() : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Error */}
                            {detail.error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-xs text-red-400 uppercase font-medium mb-1">Error</p>
                                    <code className="text-xs text-red-300 font-mono">{detail.error}</code>
                                </div>
                            )}

                            {/* Instructions */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Instructions ({detail.instructions.length})
                                </h3>
                                <div className="space-y-2">
                                    {detail.instructions.map((ix, i) => (
                                        <div key={i} className="p-3 bg-secondary/20 rounded-lg border border-border/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-semibold text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                    Instruction {i + 1}
                                                </span>
                                                {ix.program && (
                                                    <span className="text-xs font-medium text-foreground">{ix.program}</span>
                                                )}
                                            </div>
                                            
                                            {/* Human Readable Interpretation */}
                                            {ix.program === 'system' && ix.parsed?.type === 'transfer' && (
                                                <div className="mb-3 p-3 bg-background rounded border border-border/50">
                                                    <p className="text-sm font-medium">Transfer SOL</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Amount: <span className="font-mono text-foreground font-semibold">{(ix.parsed.info.lamports / 1e9).toFixed(4)} SOL</span>
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-mono mt-1 break-all">
                                                        To: {ix.parsed.info.destination}
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {ix.program === 'spl-token' && ix.parsed?.type === 'transfer' && (
                                                <div className="mb-3 p-3 bg-background rounded border border-border/50">
                                                    <p className="text-sm font-medium">Transfer Token</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Amount: <span className="font-mono text-foreground font-semibold">{ix.parsed.info.amount}</span>
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-mono mt-1 break-all">
                                                        To: {ix.parsed.info.destination}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Advanced Raw Data Collapsible */}
                                            <details className="mt-2 group">
                                                <summary className="text-[11px] font-medium text-muted-foreground cursor-pointer hover:text-primary transition-colors select-none">
                                                    Developer Details
                                                </summary>
                                                <div className="mt-2 pl-2 border-l-2 border-muted">
                                                    <code className="text-[10px] font-mono text-muted-foreground break-all block mb-2">
                                                        Program ID: {ix.programId}
                                                    </code>
                                                    {ix.parsed && (
                                                        <pre className="text-[10px] font-mono text-muted-foreground bg-background/50 rounded p-2 overflow-x-auto">
                                                            {JSON.stringify(ix.parsed, null, 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                            </details>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Log Messages */}
                            {detail.logMessages && detail.logMessages.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Log Messages
                                    </h3>
                                    <div className="bg-background/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                                        {detail.logMessages.map((log, i) => (
                                            <p key={i} className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                                                {log}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
