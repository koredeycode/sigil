"use client";
import {
    Authorized,
    Connection,
    Keypair,
    Lockup,
    PublicKey,
    StakeProgram,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import { useEffect, useState } from "react";

export default function TestDappPage() {
  const [provider, setProvider] = useState<any>(null);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);
  const [recipient, setRecipient] = useState<string>("");
  const [amountLabel, setAmountLabel] = useState<string>("0.5");
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [activeMode, setActiveMode] = useState<"transfer" | "stake">("transfer");
  const [validators, setValidators] = useState<any[]>([]);
  const [selectedValidator, setSelectedValidator] = useState<string>("");
  const [isLoadingValidators, setIsLoadingValidators] = useState(false);

  useEffect(() => {
    if (!recipient) {
      setIsValidAddress(true); // defaults to 111...1
      return;
    }
    try {
      new PublicKey(recipient);
      setIsValidAddress(true);
    } catch {
      setIsValidAddress(false);
    }
  }, [recipient]);

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
    window.addEventListener("sigil#initialized", checkProvider, { once: true });

    return () => {
      window.removeEventListener("sigil#initialized", checkProvider);
    };
  }, []);

  // Fetch validators when switching to stake mode
  useEffect(() => {
    if (activeMode === "stake" && validators.length === 0) {
      const fetchValidators = async () => {
        setIsLoadingValidators(true);
        try {
          const res = await fetch("http://localhost:74445/api/wallet/provider/validators");
          const data = await res.json();
          if (data.data) {
            setValidators(data.data);
            if (data.data.length > 0) {
              setSelectedValidator(data.data[0].voteAccount);
            }
          }
        } catch (e) {
          console.error("Failed to fetch validators:", e);
        } finally {
          setIsLoadingValidators(false);
        }
      };
      fetchValidators();
    }
  }, [activeMode, validators.length]);

  // Listen for account changes from the extension
  useEffect(() => {
    if (!provider) return;

    const handleAccountChanged = (newPublicKey: any) => {
      console.log("[Test dApp] Account changed event received");
      console.log("[Test dApp] New publicKey object:", newPublicKey);
      if (newPublicKey) {
        const pubkeyString = newPublicKey.toBase58
          ? newPublicKey.toBase58()
          : newPublicKey;
        console.log("[Test dApp] Setting pubkey state to:", pubkeyString);
        setPubkey(pubkeyString);
      } else {
        console.log("[Test dApp] Clearing pubkey state");
        setPubkey(null);
      }
    };

    console.log("[Test dApp] Registering accountChanged listener");
    provider.on("accountChanged", handleAccountChanged);

    return () => {
      console.log("[Test dApp] Removing accountChanged listener");
      provider.removeListener("accountChanged", handleAccountChanged);
    };
  }, [provider]);

  const connectWallet = async () => {
    // @ts-ignore
    const currentProvider = provider || window.sigil;

    if (!currentProvider) {
      alert(
        "Sigil Extension not found! Make sure it is installed and enabled.",
      );
      return;
    }

    setIsConnecting(true);
    try {
      const res = await currentProvider.connect();
      setPubkey(
        res.publicKey.toBase58 ? res.publicKey.toBase58() : res.publicKey,
      );
      setIsWalletModalOpen(false);
    } catch (error: any) {
      alert("Connection rejected or failed: " + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (provider) {
      try {
        await provider.disconnect();
      } catch (e) {}
    }
    setPubkey(null);
    setTxResult(null);
  };

  const simulateTransaction = async () => {
    if (!provider || !pubkey) return;

    setIsSimulating(true);
    setTxResult(null);

    try {
      console.log("[Test dApp] Building transaction with pubkey:", pubkey);
      console.log(
        "[Test dApp] Provider publicKey:",
        provider.publicKey?.toBase58(),
      );

      // Use devnet for the test-dapp to match the extension constraints
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed",
      );
      const { blockhash } = await connection.getLatestBlockhash();

      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(
          recipient || "11111111111111111111111111111111",
        );
      } catch (e) {
        setTxResult({
          status: "rejected",
          error:
            "Invalid Solana address. Please enter a valid base58-encoded address.",
        });
        setIsSimulating(false);
        return;
      }

      const amountToTransfer = parseFloat(amountLabel || "0.5") * 1e9;

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(pubkey),
          toPubkey: recipientPubkey,
          lamports: amountToTransfer,
        }),
      );

      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(pubkey);

      console.log("[Test dApp] Transaction feePayer:", tx.feePayer.toBase58());
      console.log("[Test dApp] Requesting signature from provider...");

      const signedTx = await provider.signTransaction(tx);

      // Submit the signed transaction to devnet
      const rawTx = signedTx.serialize();
      const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
      });

      console.log("[Test dApp] Transaction sent:", signature);
      setTxResult({ status: "success", signature });
    } catch (error: any) {
      console.error("[Test dApp] Transaction failed:", error);
      setTxResult({ status: "rejected", error: error.message });
    } finally {
      setIsSimulating(false);
    }
  };

  const executeStake = async () => {
    if (!provider || !pubkey || !selectedValidator) return;

    setIsSimulating(true);
    setTxResult(null);

    try {
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed",
      );
      const { blockhash } = await connection.getLatestBlockhash();

      const stakeKeypair = Keypair.generate();
      const lamports = parseFloat(amountLabel || "0.5") * 1e9;
      const walletPubkey = new PublicKey(pubkey);
      const validatorPubkey = new PublicKey(selectedValidator);

      const tx = new Transaction().add(
        StakeProgram.createAccount({
          fromPubkey: walletPubkey,
          stakePubkey: stakeKeypair.publicKey,
          authorized: new Authorized(walletPubkey, walletPubkey),
          lamports,
          lockup: new Lockup(0, 0, walletPubkey),
        }),
        StakeProgram.delegate({
          stakePubkey: stakeKeypair.publicKey,
          authorizedPubkey: walletPubkey,
          votePubkey: validatorPubkey,
        }),
      );

      tx.recentBlockhash = blockhash;
      tx.feePayer = walletPubkey;

      // Partial sign with the new stake account's keypair
      tx.partialSign(stakeKeypair);

      console.log("[Test dApp] Requesting signature from provider...");
      const signedTx = await provider.signTransaction(tx);

      const rawTx = signedTx.serialize();
      const signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
      });

      console.log("[Test dApp] Stake transaction sent:", signature);
      setTxResult({ status: "success", signature });
    } catch (error: any) {
      console.error("[Test dApp] Staking failed:", error);
      setTxResult({ status: "rejected", error: error.message });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="container py-24 flex min-h-screen flex-col items-center gap-12 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          dApp Integration Test
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Test the Sigil extension's connection and transaction signing flow.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-lg p-8 w-full max-w-md text-center space-y-8">
        {!pubkey ? (
          <>
            <h2 className="text-2xl font-bold">Connect your Wallet</h2>
            <p className="text-muted-foreground">
              To interact with this dApp, you need to connect your Solana
              wallet.
            </p>

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
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Connected Wallet
                </p>
                <code className="text-sm font-mono">
                  {pubkey.slice(0, 8)}...{pubkey.slice(-8)}
                </code>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={disconnectWallet}
                  className="text-xs text-red-500 hover:text-red-400 font-semibold px-3 py-1 bg-red-500/10 rounded-full transition-colors"
                >
                  Disconnect
                </button>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex p-1 bg-secondary/30 rounded-lg mb-6">
                <button
                  onClick={() => setActiveMode("transfer")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeMode === "transfer" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Send SOL
                </button>
                <button
                  onClick={() => setActiveMode("stake")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeMode === "stake" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Stake SOL
                </button>
              </div>

              {activeMode === "transfer" ? (
                <div>
                  <h3 className="text-lg font-semibold">Test Transaction</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Trigger a raw SOL transfer. The Sigil Agent will intercept and
                    analyze it.
                  </p>

                  <div className="space-y-3 mb-6">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Destination Address
                      </label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="e.g. 5xV..."
                        className={`w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${!isValidAddress ? "border-red-500/50 focus:ring-red-500/50" : "border-border focus:ring-primary/50"}`}
                      />
                      {!isValidAddress && (
                        <p className="text-xs text-red-500 mt-1 font-medium">
                          Invalid Solana address format.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Amount (SOL)
                      </label>
                      <input
                        type="number"
                        value={amountLabel}
                        onChange={(e) => setAmountLabel(e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <button
                    onClick={simulateTransaction}
                    disabled={isSimulating || !isValidAddress}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSimulating ? "Waiting for Agent..." : "Trigger Transaction"}
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold">Native Staking</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Delegate SOL to a validator. This requires a multi-signer transaction.
                  </p>

                  <div className="space-y-3 mb-6">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Select Validator
                      </label>
                      {isLoadingValidators ? (
                        <div className="w-full mt-1 px-3 py-2 bg-secondary/50 rounded-lg text-sm animate-pulse">
                          Loading validators...
                        </div>
                      ) : (
                        <select
                          value={selectedValidator}
                          onChange={(e) => setSelectedValidator(e.target.value)}
                          className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {validators.map((v) => (
                            <option key={v.voteAccount} value={v.voteAccount}>
                              {v.name} ({v.voteAccount.slice(0, 4)}...{v.voteAccount.slice(-4)}) - {v.commission}%
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Amount to Stake (SOL)
                      </label>
                      <input
                        type="number"
                        value={amountLabel}
                        onChange={(e) => setAmountLabel(e.target.value)}
                        step="0.1"
                        min="0.1"
                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <button
                    onClick={executeStake}
                    disabled={isSimulating || !selectedValidator}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSimulating ? "Waiting for Agent..." : "Stake SOL"}
                  </button>
                </div>
              )}

              {txResult && (
                <div
                  className={`p-4 rounded-lg border text-sm ${
                    txResult.status === "success"
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <strong className="block mb-1 font-semibold">
                    {txResult.status === "success"
                      ? "Transaction Submitted!"
                      : "Transaction Failed"}
                  </strong>
                  {txResult.status === "success" ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">
                        Transaction has been signed and submitted to Solana
                        Devnet.
                      </p>
                      <a
                        href={`https://explorer.solana.com/tx/${txResult.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                      >
                        View on Solana Explorer ↗
                      </a>
                      <p className="text-xs text-muted-foreground font-mono break-all mt-1">
                        {txResult.signature}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {txResult.error}
                    </span>
                  )}
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
              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
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
                  <img
                    src="/logo.png"
                    alt="Sigil"
                    className="w-10 h-10 rounded-full shadow-sm"
                  />
                  <span className="font-semibold text-lg text-foreground">
                    Sigil Wallet Extension
                  </span>
                </div>
                {isConnecting ? (
                  <span className="text-xs text-muted-foreground animate-pulse font-medium">
                    Connecting...
                  </span>
                ) : provider ? (
                  <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full font-medium">
                    Detected
                  </span>
                ) : (
                  <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full font-medium">
                    Not Found
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
