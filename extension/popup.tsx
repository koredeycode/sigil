// @ts-nocheck
import iconBase64 from "data-base64:~assets/icon.png";
import { useEffect, useState } from "react";

const SIGIL_SERVER_URL = "http://127.0.0.1:7445";

export default function IndexPopup() {
  const [requestObj, setRequestObj] = useState<any>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [mainPubkey, setMainPubkey] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions'>('portfolio');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Theme colors
  const colors = {
      bg: theme === 'dark' ? '#09090b' : '#fafafa',
      text: theme === 'dark' ? '#fafafa' : '#09090b',
      textMuted: theme === 'dark' ? '#a1a1aa' : '#71717a',
      cardBg: theme === 'dark' ? '#18181b' : '#ffffff',
      border: theme === 'dark' ? '#27272a' : '#e4e4e7',
      hover: theme === 'dark' ? 'rgba(39, 39, 42, 0.4)' : 'rgba(244, 244, 245, 0.8)',
      btnBg: theme === 'dark' ? 'rgba(39, 39, 42, 0.5)' : '#f4f4f5',
  };

  useEffect(() => {
    // Check if opened via window.create() with a ?request= param
    const params = new URLSearchParams(window.location.search);
    const reqId = params.get("request");
    
    if (reqId) {
      setRequestId(reqId);
      chrome.storage.local.get([`request_${reqId}`], (result) => {
        if (result[`request_${reqId}`]) {
          setRequestObj(result[`request_${reqId}`]);
        }
      });
    } else {
      // Normal popup open
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch(`${SIGIL_SERVER_URL}/api/status`);
      if (res.ok) {
        setIsConnected(true);
        const extRes = await fetch(`${SIGIL_SERVER_URL}/api/extension/connect`, { method: "POST" });
        if (extRes.ok) {
            const data = await extRes.json();
            setMainPubkey(data.data.publicKey);
        }
      } else {
        setIsConnected(false);
      }
    } catch (e) {
      setIsConnected(false);
    }
  };

  const resolveRequest = async (data: any, error?: string) => {
    if (!requestId) return;
    
    if (requestObj?.type === 'signTransaction' && !error) {
         try {
             data = { signedTransaction: requestObj.transactionMessage };
         } catch(e: any) {
             error = e.message;
         }
    }

    chrome.runtime.sendMessage({
       type: "resolve_request",
       requestId,
       data,
       error
    });

    chrome.storage.local.remove([`request_${requestId}`]);
    window.close();
  };

  if (requestObj?.type === "connect") {
      return (
         <div style={{ padding: "24px", width: "100%", height: "100vh", fontFamily: "sans-serif", backgroundColor: colors.bg, color: colors.text, display: "flex", flexDirection: "column", transition: "all 0.2s" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <img src={iconBase64} alt="Sigil" style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "16px", objectFit: "cover" }} />
                <h2 style={{ fontSize: "20px", margin: "0 0 8px 0" }}>Connect to Sigil</h2>
                <p style={{ color: colors.textMuted, fontSize: "14px", margin: "0 0 24px 0" }}>
                   <strong style={{ color: colors.text }}>{requestObj.origin}</strong> wants to connect to your local Sigil agent.
                </p>

                <div style={{ backgroundColor: colors.border, padding: "16px", borderRadius: "8px", width: "100%", textAlign: "left" }}>
                   <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: colors.textMuted, textTransform: "uppercase" }}>Permissions Requested</p>
                   <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "14px", color: colors.text }}>
                      <li>View your wallet balance and activity</li>
                      <li>Request approval for transactions</li>
                   </ul>
                </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button 
                  onClick={() => resolveRequest(null, "User rejected the connection.")}
                  style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1px solid ${colors.textMuted}`, backgroundColor: "transparent", color: colors.text, cursor: "pointer", fontWeight: "bold" }}>
                    Cancel
                </button>
                <button 
                  onClick={async () => {
                      try {
                          const extRes = await fetch(`${SIGIL_SERVER_URL}/api/extension/connect`, { method: "POST" });
                          const data = await extRes.json();
                          if (!extRes.ok) throw new Error(data.message || "Unknown server error");
                          if (!data.data || !data.data.publicKey) throw new Error("No public key returned by agent");
                          
                          resolveRequest({ publicKey: data.data.publicKey });
                      } catch (e: any) {
                          resolveRequest(null, "Failed to connect to Sigil: " + e.message);
                      }
                  }}
                  style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: theme === 'dark' ? "#fff" : "#000", color: theme === 'dark' ? "#000" : "#fff", cursor: "pointer", fontWeight: "bold" }}>
                    Connect
                </button>
            </div>
         </div>
      );
  }

  // Common Header matching WalletView
  const renderHeader = () => (
      <div style={{ padding: "24px", paddingBottom: "16px", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>Portfolio</h2>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <button 
                      onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: colors.textMuted, padding: 0 }}
                      title="Toggle Theme"
                  >
                      {theme === 'dark' ? '☀️' : '🌙'}
                  </button>
                  <div style={{ padding: "6px", borderRadius: "8px", cursor: "pointer", display: "flex" }}>
                      <img src={iconBase64} alt="Sigil" style={{ width: "20px", height: "20px", borderRadius: "4px" }} />
                  </div>
              </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "99px", backgroundColor: colors.hover, border: `1px solid ${colors.border}`, width: "fit-content", marginBottom: "16px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: theme === 'dark' ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#8b5cf6" }}>A</span>
              </div>
              <span style={{ fontSize: "12px", fontWeight: "600" }}>Active Agent</span>
              <span style={{ width: "1px", height: "12px", backgroundColor: colors.border }}></span>
              <code style={{ fontSize: "11px", color: colors.textMuted, fontFamily: "monospace" }}>
                 {mainPubkey ? `${mainPubkey.slice(0, 4)}...${mainPubkey.slice(-4)}` : "Not connected"}
              </code>
          </div>

          <div style={{ marginBottom: "8px" }}>
             <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: colors.textMuted, fontWeight: "500" }}>Account Value</p>
             <h1 style={{ margin: 0, fontSize: "36px", fontWeight: "900", letterSpacing: "-0.02em" }}>{isConnected ? "0.0000 SOL" : "—"}</h1>
          </div>
      </div>
  );

  // Default popup view replacing WalletView
  if (!requestObj) {
      return (
        <div style={{ width: "400px", minHeight: "600px", fontFamily: "sans-serif", backgroundColor: colors.bg, color: colors.text, padding: "0", display: "flex", flexDirection: "column", transition: "all 0.2s" }}>
           {renderHeader()}
           
           <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
               {/* Tabs */}
               <div style={{ padding: "0 24px 8px 24px", marginTop: "12px" }}>
                   <div style={{ display: "flex", padding: "2px", backgroundColor: colors.btnBg, borderRadius: "8px" }}>
                        <button 
                            onClick={() => setActiveTab('portfolio')}
                            style={{ flex: 1, padding: "6px", fontSize: "12px", fontWeight: "600", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.2s", backgroundColor: activeTab === 'portfolio' ? colors.bg : "transparent", color: activeTab === 'portfolio' ? colors.text : colors.textMuted, boxShadow: activeTab === 'portfolio' ? "0 1px 2px rgba(0,0,0,0.1)" : "none" }}>
                            Assets
                        </button>
                        <button 
                            onClick={() => setActiveTab('transactions')}
                            style={{ flex: 1, padding: "6px", fontSize: "12px", fontWeight: "600", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.2s", backgroundColor: activeTab === 'transactions' ? colors.bg : "transparent", color: activeTab === 'transactions' ? colors.text : colors.textMuted, boxShadow: activeTab === 'transactions' ? "0 1px 2px rgba(0,0,0,0.1)" : "none" }}>
                            Activity
                        </button>
                   </div>
               </div>
               
               {/* Content */}
               <div style={{ padding: "0 24px 24px 24px", flex: 1, overflowY: "auto" }}>
                   {activeTab === 'portfolio' && (
                       <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 8px 0" }}>
                                <h3 style={{ fontSize: "14px", fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Balances</h3>
                            </div>
                            
                            {/* SOL Card */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px", margin: "0 -8px", borderRadius: "8px", cursor: "pointer", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.backgroundColor = colors.hover} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                   <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(to bottom right, #a855f7, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "12px" }}>
                                      S
                                   </div>
                                   <div>
                                      <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Solana</h3>
                                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: colors.textMuted, textTransform: "uppercase" }}>SOL</p>
                                   </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                   <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>0.00 SOL</h3>
                                   <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: colors.textMuted }}>Devnet</p>
                                </div>
                            </div>
                       </div>
                   )}

                   {activeTab === 'transactions' && (
                       <div style={{ textAlign: "center", padding: "32px 0", color: colors.textMuted, fontSize: "14px" }}>
                           No recent activity bounds.
                       </div>
                   )}
               </div>
           </div>
        </div>
      );
  }

  // Sign Transaction view perfectly matches Transaction Detail Modal inside the Wallet View envelope
  if (requestObj?.type === "signTransaction") {
      const sim = requestObj.simulationData;
      const isApproved = sim?.status === "approved";

      return (
         <div style={{ width: "400px", minHeight: "650px", fontFamily: "sans-serif", backgroundColor: colors.bg, color: colors.text, display: "flex", flexDirection: "column", transition: "all 0.2s" }}>
            <div style={{ padding: "20px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                 <div>
                    <h2 style={{ fontSize: "18px", margin: "0", fontWeight: "bold" }}>Transaction Details</h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                        <code style={{ fontSize: "12px", color: colors.textMuted, fontFamily: "monospace" }}>{requestObj?.origin || "Unknown dApp"}</code>
                    </div>
                 </div>
                 <div style={{ backgroundColor: colors.btnBg, padding: "4px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", color: colors.textMuted }}>
                    Signature Request
                 </div>
            </div>
            
            <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
                {/* Agent Analysis Grid Match */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ padding: "12px", backgroundColor: isApproved ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)", border: `1px solid ${isApproved ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`, borderRadius: "8px" }}>
                        <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: colors.textMuted, textTransform: "uppercase", fontWeight: "500" }}>Analysis Status</p>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: isApproved ? "#10b981" : "#ef4444" }}>
                            {isApproved ? "Confirmed Safe" : "Action Required / Warning"}
                        </span>
                        
                        <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: theme === 'dark' ? "#d4d4d8" : "#3f3f46", lineHeight: "1.5" }}>
                            {sim?.analysis || "The agent could not analyze this transaction."}
                        </p>
                    </div>
                    {sim?.error && (
                         <div style={{ padding: "12px", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px" }}>
                            <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#fca5a5", textTransform: "uppercase", fontWeight: "500" }}>Error</p>
                            <code style={{ fontSize: "12px", color: "#fpt8b4", fontFamily: "monospace" }}>{sim.error}</code>
                        </div>
                    )}
                </div>

                {/* Instructions / Raw Data section equivalent */}
                <div>
                     <h3 style={{ fontSize: "14px", fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                         Raw Payload
                     </h3>
                     <div style={{ padding: "12px", backgroundColor: colors.btnBg, borderRadius: "8px", border: `1px solid ${colors.border}` }}>
                          <details>
                              <summary style={{ fontSize: "12px", fontWeight: "500", color: colors.textMuted, cursor: "pointer", userSelect: "none" }}>
                                 View Developer Details
                              </summary>
                              <div style={{ marginTop: "8px", paddingLeft: "8px", borderLeft: `2px solid ${colors.border}` }}>
                                  <pre style={{ fontSize: "10px", fontFamily: "monospace", color: colors.textMuted, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                      {typeof requestObj.transactionMessage === 'string' ? requestObj.transactionMessage : JSON.stringify(requestObj.transactionMessage, null, 2)}
                                  </pre>
                              </div>
                          </details>
                     </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div style={{ padding: "16px 20px", borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bg, display: "flex", gap: "12px", zIndex: 10 }}>
                <button 
                  onClick={() => resolveRequest(null, "User rejected the transaction.")}
                  style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg, color: colors.text, cursor: "pointer", fontWeight: "bold", transition: "background 0.2s" }}>
                    Reject
                </button>
                <button 
                  onClick={() => resolveRequest({ approved: true })}
                  style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: isApproved ? "#3b82f6" : "#ef4444", color: "#fff", cursor: "pointer", fontWeight: "bold", transition: "opacity 0.2s" }}>
                   {isApproved ? "Sign Transaction" : "Sign Anyway"}
                </button>
            </div>
         </div>
      );
  }

  return null;
}
