"use client"
import { useEffect, useState } from "react";

export default function TestDappPage() {
  const [provider, setProvider] = useState<any>(null);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);

  useEffect(() => {
    // Wait for the injected script to load
    const checkProvider = () => {
      // @ts-ignore
      if (window.sigil) {
        // @ts-ignore
        setProvider(window.sigil);
      }
    };

    checkProvider();
    
    // Listen for the initialization event just in case
    window.addEventListener('sigil#initialized', checkProvider, { once: true });
    
    return () => {
        window.removeEventListener('sigil#initialized', checkProvider);
    };
  }, []);

  const connectWallet = async () => {
    if (!provider) {
       alert("Sigil Extension not found!");
       return;
    }
    
    setIsConnecting(true);
    try {
      const res = await provider.connect();
      setPubkey(res.publicKey.toBase58 ? res.publicKey.toBase58() : res.publicKey);
      setIsWalletModalOpen(false);
    } catch (error: any) {
      alert("Connection rejected or failed: " + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const simulateTransaction = async () => {
    if (!provider || !pubkey) return;

    setIsSimulating(true);
    setTxResult(null);

    try {
      const dummyTx = {
        instructions: [{ programId: "11111111111111111111111111111111", data: "transfer" }],
        serialize: () => new Uint8Array([1, 2, 3, 4, 5]), // Mock serialize method
        version: "legacy"
      };

      const result = await provider.signTransaction(dummyTx);
      
      setTxResult({ status: "success", tx: result });
      
    } catch (error: any) {
      setTxResult({ status: "rejected", error: error.message });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="container py-24 flex min-h-screen flex-col items-center gap-12 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">dApp Integration Test</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Test the Sigil extension's connection and transaction signing flow.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-lg p-8 w-full max-w-md text-center space-y-8">
        {!pubkey ? (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="text-2xl">🔌</span>
              </div>
              <h2 className="text-2xl font-bold">Connect your Wallet</h2>
              <p className="text-muted-foreground">To interact with this dApp, you need to connect your Solana wallet.</p>
              
              <button 
                  onClick={() => setIsWalletModalOpen(true)}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                  Select Wallet
              </button>
            </>
        ) : (
            <div className="space-y-6 text-left">
               <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border border-dashed">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Connected Wallet</p>
                    <code className="text-sm font-mono">{pubkey.slice(0, 8)}...{pubkey.slice(-8)}</code>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               </div>

               <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                     <h3 className="text-lg font-semibold">Test Transaction</h3>
                     <p className="text-sm text-muted-foreground">Trigger a raw transaction. The Sigil extension will intercept and analyze it.</p>
                  </div>
                  
                  <button 
                      onClick={simulateTransaction}
                      disabled={isSimulating}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                      {isSimulating ? "Waiting for Agent..." : "Trigger Transaction"}
                  </button>

                  {txResult && (
                      <div className={`p-4 rounded-lg border text-sm ${
                          txResult.status === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                      }`}>
                          <strong className="block mb-1 font-semibold">{txResult.status === 'success' ? 'Transaction Signed!' : 'Transaction Rejected'}</strong>
                          <span className="text-muted-foreground">{txResult.error || "The Agent signed the transaction and returned the buffer."}</span>
                      </div>
                  )}
               </div>
            </div>
        )}
      </div>

      {/* Wallet Selection Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h3 className="text-lg font-bold">Select a Wallet</h3>
                    <button onClick={() => setIsWalletModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                        ✕
                    </button>
                </div>
                <div className="p-4 bg-secondary/20">
                    <button 
                        onClick={connectWallet}
                        disabled={isConnecting}
                        className="w-full flex items-center justify-between p-4 bg-background border border-border rounded-xl hover:border-primary/50 transition-colors disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Sigil" className="w-10 h-10 rounded-full shadow-sm" />
                            <span className="font-semibold text-lg text-foreground">Sigil Extension</span>
                        </div>
                        {isConnecting ? (
                             <span className="text-xs text-muted-foreground animate-pulse font-medium">Connecting...</span>
                        ) : provider ? (
                            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full font-medium">Detected</span>
                        ) : (
                            <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full font-medium">Not Found</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
