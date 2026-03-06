import iconBase64 from "data-base64:~assets/icon.png"
import { ArrowUpRight, ExternalLink } from "lucide-react"
import { useEffect, useState } from "react"

import { config } from "./core/config"

// ─── Type Definitions ──────────────────────────────────────────────────────

interface SimulationData {
  analysis?: string
  riskLevel?: "LOW" | "MEDIUM" | "HIGH"
  error?: string
}

interface RequestData {
  type: "connect" | "signTransaction"
  origin: string
  transactionMessage?: string
  simulationData?: SimulationData
}

interface TokenAccount {
  address: string
  mint: string
  balance: number
  decimals: number
  symbol: string
}

interface Portfolio {
  sol: number
  solLamports: number
  tokens: TokenAccount[]
  pubkey: string
}

interface Transaction {
  signature: string
  blockTime: string | null
  slot: number
  status: string
  err: unknown
  memo: string | null
}

interface StorageChanges {
  [key: string]: chrome.storage.StorageChange
}

const SIGIL_SERVER_URL = config.SERVER_URL

/**
 * Authenticated fetch wrapper. Reads the auth token from chrome.storage.local
 * and attaches it as a Bearer header. If the response is 401, clears the stored
 * token and returns the response so the caller can trigger re-auth.
 */
async function authFetch(
  url: string,
  opts: RequestInit = {}
): Promise<Response> {
  const token = await new Promise<string | null>((resolve) => {
    chrome.storage.local.get(["sigil_auth_token"], (result) => {
      resolve(result.sigil_auth_token || null)
    })
  })

  const headers = new Headers(opts.headers || {})
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  if (!headers.has("Content-Type") && opts.body) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(url, { ...opts, headers })

  if (res.status === 401) {
    // Token is stale (server restarted) — clear it
    chrome.storage.local.remove(["sigil_auth_token"])
  }

  return res
}

export default function IndexPopup() {
  const [requestObj, setRequestObj] = useState<RequestData | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [mainPubkey, setMainPubkey] = useState<string>("")
  const [agentName, setAgentName] = useState<string>("")
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState<"portfolio" | "transactions">(
    "portfolio"
  )
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(true)
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [isSigning, setIsSigning] = useState(false)
  const [simulationData, setSimulationData] = useState<SimulationData | null>(
    null
  )
  const [isSimulating, setIsSimulating] = useState(false)

  // Auth token state
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState<string>("")
  const [tokenError, setTokenError] = useState<string>("")
  const [isValidatingToken, setIsValidatingToken] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Multi-agent selection state
  interface Agent {
    id: string
    name: string
    pubkey: string
    status: string
  }
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [agentsLoaded, setAgentsLoaded] = useState(false)

  // Check for stored auth token on mount
  useEffect(() => {
    chrome.storage.local.get(["sigil_auth_token", "sigil_theme"], (result) => {
      // Theme
      if (result.sigil_theme) {
        setTheme(result.sigil_theme)
      } else {
        const isSysDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches
        setTheme(isSysDark ? "dark" : "light")
      }

      // Auth token
      if (result.sigil_auth_token) {
        setAuthToken(result.sigil_auth_token)
      }
      setAuthChecked(true)
    })

    // Listen for storage changes across different popup windows
    const listener = (changes: StorageChanges, namespace: string) => {
      if (namespace === "local" && changes.sigil_theme) {
        setTheme(changes.sigil_theme.newValue)
      }
      if (namespace === "local" && changes.sigil_auth_token) {
        setAuthToken(changes.sigil_auth_token.newValue || null)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  // Handle token submission
  const handleTokenSubmit = async () => {
    if (!tokenInput.trim()) {
      setTokenError("Please enter a token")
      return
    }
    setIsValidatingToken(true)
    setTokenError("")

    try {
      const res = await fetch(`${SIGIL_SERVER_URL}/api/wallet/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput.trim() })
      })
      const data = await res.json()

      if (!res.ok) {
        setTokenError(data.message || "Invalid token")
        return
      }

      // Store the validated token
      chrome.storage.local.set({ sigil_auth_token: tokenInput.trim() }, () => {
        setAuthToken(tokenInput.trim())
        setTokenInput("")
      })
    } catch (err) {
      setTokenError("Cannot reach Sigil server. Is it running?")
    } finally {
      setIsValidatingToken(false)
    }
  }

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark"
      chrome.storage.local.set({ sigil_theme: next })
      return next
    })
  }

  // Theme colors
  const colors = {
    bg: theme === "dark" ? "#09090b" : "#fafafa",
    text: theme === "dark" ? "#fafafa" : "#09090b",
    textMuted: theme === "dark" ? "#a1a1aa" : "#71717a",
    cardBg: theme === "dark" ? "#18181b" : "#ffffff",
    border: theme === "dark" ? "#27272a" : "#e4e4e7",
    hover:
      theme === "dark" ? "rgba(39, 39, 42, 0.4)" : "rgba(244, 244, 245, 0.8)",
    btnBg: theme === "dark" ? "rgba(39, 39, 42, 0.5)" : "#f4f4f5"
  }

  useEffect(() => {
    // Check if opened via window.create() with a ?request= param
    const params = new URLSearchParams(window.location.search)
    const reqId = params.get("request")

    if (reqId) {
      setRequestId(reqId)
      chrome.storage.local.get(
        [`request_${reqId}`],
        (result: Record<string, unknown>) => {
          const stored = result[`request_${reqId}`] as RequestData | undefined
          if (stored) {
            setRequestObj(stored)
          }
        }
      )
      // Also check connection for approval popups
      const checkStatus = async () => {
        try {
          const res = await fetch(`${SIGIL_SERVER_URL}/api/status`)
          setIsConnected(res.ok)
        } catch (e) {
          setIsConnected(false)
        } finally {
          setIsLoading(false)
        }
      }
      checkStatus()
    } else {
      // Normal popup open - wait for agents to load first
      // checkConnection will be called after agents are loaded
      const checkStatus = async () => {
        try {
          const res = await fetch(`${SIGIL_SERVER_URL}/api/status`)
          setIsConnected(res.ok)
        } catch (e) {
          setIsConnected(false)
        } finally {
          setIsLoading(false)
        }
      }
      checkStatus()
    }
  }, [])

  // Load agents when authenticated
  useEffect(() => {
    if (!authToken || !isConnected) return

    const loadAgents = async () => {
      try {
        const res = await authFetch(`${SIGIL_SERVER_URL}/api/agents`)
        if (res.ok) {
          const data = await res.json()
          setAgents(data.data || [])

          // Restore selected agent from storage, or default to main agent
          chrome.storage.local.get(["active_agent_id"], (result) => {
            let agentToSelect: string | null = null

            if (
              result.active_agent_id &&
              data.data.some((a: Agent) => a.id === result.active_agent_id)
            ) {
              agentToSelect = result.active_agent_id
            } else {
              // Default to main "sigil" agent
              const mainAgent = data.data.find((a: Agent) => a.name === "sigil")
              if (mainAgent) {
                agentToSelect = mainAgent.id
                chrome.storage.local.set({ active_agent_id: mainAgent.id })
              }
            }

            setSelectedAgentId(agentToSelect)
            setAgentsLoaded(true)

            // Now connect to the selected agent
            if (agentToSelect) {
              checkConnection(agentToSelect)
            }
          })
        }
      } catch (e) {
        console.error("Failed to load agents:", e)
      }
    }

    loadAgents()
  }, [authToken, isConnected])

  // Listen for storage changes to keep selectedAgentId in sync
  useEffect(() => {
    const handleStorageChange = (
      changes: StorageChanges,
      areaName: "sync" | "local" | "managed" | "session"
    ) => {
      if (areaName === "local" && changes.active_agent_id) {
        const newAgentId = changes.active_agent_id.newValue
        console.log(
          `[Popup] Storage changed, updating selectedAgentId to:`,
          newAgentId
        )
        setSelectedAgentId(newAgentId)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  useEffect(() => {
    if (!requestObj) return

    if (requestObj.type === "signTransaction" && requestObj.simulationData) {
      setSimulationData(requestObj.simulationData)
    }

    // If it's a signTransaction and we have the message but no sim data, fetch it
    if (
      requestObj.type === "signTransaction" &&
      !requestObj.simulationData &&
      requestObj.transactionMessage
    ) {
      setIsSimulating(true)

      // Read CURRENT agent from storage for simulation
      chrome.storage.local.get(["active_agent_id"], (result) => {
        const currentAgentId = result.active_agent_id || null

        authFetch(`${SIGIL_SERVER_URL}/api/wallet/provider/simulate`, {
          method: "POST",
          body: JSON.stringify({
            transactionMessage: requestObj.transactionMessage,
            origin: requestObj.origin,
            agentId: currentAgentId
          })
        })
          .then((res) => {
            if (res.status === 401) {
              setAuthToken(null)
              setSimulationData({
                error: "Authentication required. Please re-enter your token.",
                riskLevel: "HIGH"
              })
              return null
            }
            return res.json()
          })
          .then((data) => {
            if (data) setSimulationData(data)
          })
          .catch((err) => {
            setSimulationData({ error: err.message, riskLevel: "HIGH" })
          })
          .finally(() => {
            setIsSimulating(false)
          })
      })
    }
  }, [requestObj])

  const checkConnection = async (agentId?: string | null) => {
    const targetAgentId = agentId !== undefined ? agentId : selectedAgentId

    try {
      const res = await fetch(`${SIGIL_SERVER_URL}/api/status`)
      if (res.ok) {
        setIsConnected(true)

        // Build query/body params with optional agentId
        const agentParam = targetAgentId ? { agentId: targetAgentId } : {}

        try {
          const extRes = await authFetch(
            `${SIGIL_SERVER_URL}/api/wallet/provider/connect`,
            {
              method: "POST",
              body: JSON.stringify(agentParam)
            }
          )
          if (extRes.status === 401) {
            setAuthToken(null)
            return
          }
          if (extRes.ok) {
            const data = await extRes.json()
            setMainPubkey(data.data.publicKey)
            if (data.data.name) setAgentName(data.data.name)
          }
        } catch (e) {
          console.error("Failed to connect:", e)
        }

        try {
          setIsPortfolioLoading(true)
          const queryParam = targetAgentId ? `?agentId=${targetAgentId}` : ""
          const portRes = await authFetch(
            `${SIGIL_SERVER_URL}/api/wallet/provider/portfolio${queryParam}`
          )
          if (portRes.status === 401) {
            setAuthToken(null)
            return
          }
          if (portRes.ok) {
            const pData = await portRes.json()
            setPortfolio(pData.data)
          }
        } catch (e) {
          console.error("Failed to load portfolio:", e)
        } finally {
          setIsPortfolioLoading(false)
        }

        try {
          setIsTransactionsLoading(true)
          const queryParam = targetAgentId ? `?agentId=${targetAgentId}` : ""
          const txRes = await authFetch(
            `${SIGIL_SERVER_URL}/api/wallet/provider/transactions${queryParam}`
          )
          if (txRes.status === 401) {
            setAuthToken(null)
            return
          }
          if (txRes.ok) {
            const txData = await txRes.json()
            setTransactions(txData.data)
          }
        } catch (e) {
          console.error("Failed to load transactions:", e)
        } finally {
          setIsTransactionsLoading(false)
        }
      } else {
        setIsConnected(false)
      }
    } catch (e) {
      console.error("Connection check failed:", e)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh data when selected agent changes (after initial load)
  useEffect(() => {
    // Skip if not loaded yet, or if this is the initial load
    if (!agentsLoaded || !selectedAgentId || !isConnected) return

    // Only refresh if agents have already been loaded (not first time)
    // We track this by checking if we have agents
    if (agents.length > 0) {
      checkConnection(selectedAgentId)
    }
  }, [selectedAgentId, agentsLoaded, isConnected])

  const renderNotConnected = () => {
    if (isLoading || isConnected === null || isConnected) return null
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor:
            theme === "dark"
              ? "rgba(9, 9, 11, 0.9)"
              : "rgba(250, 250, 250, 0.9)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          backdropFilter: "blur(4px)"
        }}>
        <img
          src={iconBase64}
          alt="Sigil"
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            marginBottom: "24px",
            opacity: 0.5,
            filter: "grayscale(100%)"
          }}
        />
        <h2
          style={{
            margin: "0 0 12px 0",
            fontSize: "20px",
            color: colors.text
          }}>
          Sigil is Offline
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: colors.textMuted,
            lineHeight: "1.5"
          }}>
          The extension cannot connect to your local backend. Please ensure you
          are running <code>sigil start</code> in your terminal.
        </p>
      </div>
    )
  }

  const resolveRequest = async (
    data: Record<string, unknown> | null,
    error?: string
  ) => {
    if (!requestId) return

    if (requestObj?.type === "signTransaction" && !error && data?.approved) {
      try {
        setIsSigning(true)

        // CRITICAL: Read the CURRENT active_agent_id from storage, not from React state
        // The user may have switched agents after the request was created
        const currentAgentId = await new Promise<string | null>((resolve) => {
          chrome.storage.local.get(["active_agent_id"], (result) => {
            resolve(result.active_agent_id || null)
          })
        })

        const res = await authFetch(
          `${SIGIL_SERVER_URL}/api/wallet/provider/sign`,
          {
            method: "POST",
            body: JSON.stringify({
              transactionMessage: requestObj.transactionMessage,
              agentId: currentAgentId
            })
          }
        )

        if (res.status === 401) {
          setAuthToken(null)
          throw new Error("Authentication expired. Please re-enter your token.")
        }
        if (!res.ok) {
          const errData = await res.json()
          console.error(`[Popup] Sign failed:`, errData)
          throw new Error(errData.message || "Failed to sign transaction.")
        }
        const json = await res.json()
        data = { signedTransaction: json.data.signedTransaction }
      } catch (e) {
        console.error(`[Popup] Error during signing:`, e)
        error = e instanceof Error ? e.message : "Unknown error"
      } finally {
        setIsSigning(false)
      }
    }

    chrome.runtime.sendMessage({
      type: "resolve_request",
      requestId,
      data,
      error
    })

    chrome.storage.local.remove([`request_${requestId}`])
    window.close()
  }

  // ─── Token Entry Screen ─────────────────────────────────────────────
  // Show if auth check is done but no token is stored (and not in a dApp request flow)
  if (authChecked && !authToken && !requestObj) {
    return (
      <div
        style={{
          padding: "24px",
          boxSizing: "border-box",
          width: "400px",
          minHeight: "600px",
          fontFamily: "sans-serif",
          backgroundColor: colors.bg,
          color: colors.text,
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s"
        }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center"
          }}>
          <img
            src={iconBase64}
            alt="Sigil"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              marginBottom: "16px",
              objectFit: "cover"
            }}
          />
          <h2 style={{ fontSize: "20px", margin: "0 0 8px 0" }}>
            Authenticate
          </h2>
          <p
            style={{
              color: colors.textMuted,
              fontSize: "14px",
              margin: "0 0 24px 0",
              lineHeight: "1.5"
            }}>
            Enter the session token from your{" "}
            <code
              style={{
                backgroundColor: colors.btnBg,
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "13px"
              }}>
              sigil start
            </code>{" "}
            output to connect.
          </p>

          <input
            type="password"
            placeholder="sig_xxxxxxxxxxxxxxxx..."
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value)
              setTokenError("")
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTokenSubmit()
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              border: `1px solid ${tokenError ? "rgba(239, 68, 68, 0.5)" : colors.border}`,
              backgroundColor: colors.cardBg,
              color: colors.text,
              outline: "none",
              fontFamily: "monospace",
              boxSizing: "border-box",
              transition: "border-color 0.2s"
            }}
          />

          {tokenError && (
            <p
              style={{
                color: "#ef4444",
                fontSize: "13px",
                margin: "8px 0 0 0",
                textAlign: "left",
                width: "100%"
              }}>
              {tokenError}
            </p>
          )}

          <button
            onClick={handleTokenSubmit}
            disabled={isValidatingToken || !tokenInput.trim()}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#16a34a",
              color: "#fff",
              cursor:
                isValidatingToken || !tokenInput.trim()
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "bold",
              fontSize: "14px",
              opacity: isValidatingToken || !tokenInput.trim() ? 0.5 : 1,
              transition: "opacity 0.2s"
            }}>
            {isValidatingToken ? "Validating..." : "Connect"}
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: colors.textMuted,
            margin: 0,
            lineHeight: "1.5"
          }}>
          The token is shown when you run{" "}
          <code
            style={{
              backgroundColor: colors.btnBg,
              padding: "2px 4px",
              borderRadius: "4px"
            }}>
            sigil start
          </code>{" "}
          in your terminal.
        </p>
      </div>
    )
  }

  if (requestObj?.type === "connect") {
    return (
      <div
        style={{
          padding: "24px",
          boxSizing: "border-box",
          width: "100%",
          height: "100vh",
          fontFamily: "sans-serif",
          backgroundColor: colors.bg,
          color: colors.text,
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s"
        }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center"
          }}>
          <img
            src={iconBase64}
            alt="Sigil"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              marginBottom: "16px",
              objectFit: "cover"
            }}
          />
          <h2 style={{ fontSize: "20px", margin: "0 0 8px 0" }}>
            Connect to Sigil
          </h2>
          <p
            style={{
              color: colors.textMuted,
              fontSize: "14px",
              margin: "0 0 24px 0"
            }}>
            <strong style={{ color: colors.text }}>{requestObj.origin}</strong>{" "}
            wants to connect to your local Sigil agent.
          </p>

          {/* Agent selector in connect modal */}
          {agents.length > 0 && (
            <div style={{ width: "100%", marginBottom: "16px" }}>
              <label
                style={{
                  fontSize: "11px",
                  color: colors.textMuted,
                  marginBottom: "8px",
                  display: "block",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: "left"
                }}>
                Select Agent to Connect
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedAgentId || ""}
                  onChange={(e) => {
                    const newAgentId = e.target.value
                    setSelectedAgentId(newAgentId)
                    chrome.storage.local.set({ active_agent_id: newAgentId })
                  }}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    paddingRight: "40px",
                    borderRadius: "10px",
                    border: `2px solid ${colors.border}`,
                    backgroundColor: colors.cardBg,
                    color: colors.text,
                    fontSize: "15px",
                    fontFamily: "inherit",
                    fontWeight: "600",
                    cursor: "pointer",
                    outline: "none",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    transition: "all 0.15s ease",
                    boxShadow: `0 2px 8px ${theme === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.08)"}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#16a34a"
                    e.currentTarget.style.boxShadow = `0 4px 12px ${theme === "dark" ? "rgba(22, 163, 74, 0.35)" : "rgba(22, 163, 74, 0.2)"}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = `0 2px 8px ${theme === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.08)"}`
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#16a34a"
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${theme === "dark" ? "rgba(22, 163, 74, 0.2)" : "rgba(22, 163, 74, 0.15)"}`
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border
                    e.currentTarget.style.boxShadow = `0 2px 8px ${theme === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.08)"}`
                  }}>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.status === "running" ? "🟢" : "🔴"} {agent.name}{" "}
                      {agent.name === "sigil" ? "(Main)" : ""}
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: colors.textMuted,
                    display: "flex",
                    alignItems: "center"
                  }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>

              {/* Show selected agent wallet address */}
              {selectedAgentId &&
                agents.find((a) => a.id === selectedAgentId) && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "10px 12px",
                      backgroundColor: colors.cardBg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "8px",
                      fontSize: "11px"
                    }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "6px"
                      }}>
                      <span
                        style={{
                          color: colors.textMuted,
                          fontWeight: "600",
                          textTransform: "uppercase"
                        }}>
                        Agent
                      </span>
                      <span style={{ color: colors.text, fontWeight: "600" }}>
                        {agents.find((a) => a.id === selectedAgentId)?.name}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between"
                      }}>
                      <span
                        style={{
                          color: colors.textMuted,
                          fontWeight: "600",
                          textTransform: "uppercase"
                        }}>
                        Wallet
                      </span>
                      <code
                        style={{
                          color: colors.text,
                          fontFamily: "monospace",
                          fontSize: "10px"
                        }}>
                        {agents
                          .find((a) => a.id === selectedAgentId)
                          ?.pubkey.slice(0, 6)}
                        ...
                        {agents
                          .find((a) => a.id === selectedAgentId)
                          ?.pubkey.slice(-6)}
                      </code>
                    </div>
                  </div>
                )}
            </div>
          )}

          <div
            style={{
              backgroundColor: colors.border,
              padding: "16px",
              borderRadius: "8px",
              width: "100%",
              textAlign: "left"
            }}>
            <p
              style={{
                margin: "0 0 4px 0",
                fontSize: "12px",
                color: colors.textMuted,
                textTransform: "uppercase"
              }}>
              Permissions Requested
            </p>
            <ul
              style={{
                margin: 0,
                padding: "0 0 0 16px",
                fontSize: "14px",
                color: colors.text
              }}>
              <li>View your wallet balance and activity</li>
              <li>Request approval for transactions</li>
            </ul>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button
            onClick={() =>
              resolveRequest(null, "User rejected the connection.")
            }
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: `1px solid ${colors.textMuted}`,
              backgroundColor: "transparent",
              color: colors.text,
              cursor: "pointer",
              fontWeight: "bold"
            }}>
            Cancel
          </button>
          <button
            onClick={async () => {
              try {
                // Read CURRENT agent from storage
                const currentAgentId = await new Promise<string | null>(
                  (resolve) => {
                    chrome.storage.local.get(["active_agent_id"], (result) => {
                      resolve(result.active_agent_id || null)
                    })
                  }
                )

                console.log(
                  `[Popup] Connecting with CURRENT agent from storage:`,
                  {
                    agentId: currentAgentId,
                    stateAgentId: selectedAgentId
                  }
                )

                // Use currentAgentId if available, otherwise let backend use default
                const agentParam = currentAgentId
                  ? { agentId: currentAgentId }
                  : {}
                const extRes = await authFetch(
                  `${SIGIL_SERVER_URL}/api/wallet/provider/connect`,
                  {
                    method: "POST",
                    body: JSON.stringify(agentParam)
                  }
                )
                if (extRes.status === 401) {
                  setAuthToken(null)
                  resolveRequest(
                    null,
                    "Authentication expired. Please re-enter your token."
                  )
                  return
                }
                const data = await extRes.json()
                if (!extRes.ok)
                  throw new Error(data.message || "Unknown server error")
                if (!data.data || !data.data.publicKey)
                  throw new Error("No public key returned by agent")

                resolveRequest({ publicKey: data.data.publicKey })
              } catch (e) {
                resolveRequest(
                  null,
                  "Failed to connect to Sigil: " +
                    (e instanceof Error ? e.message : "Unknown error")
                )
              }
            }}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#16a34a",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "bold"
            }}>
            Connect
          </button>
        </div>
      </div>
    )
  }

  // Common Header matching WalletView
  const renderHeader = () => (
    <div
      style={{
        padding: "24px",
        paddingBottom: "16px",
        borderBottom: `1px solid ${colors.border}`
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px"
        }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
          Portfolio
        </h2>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={toggleTheme}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              color: colors.textMuted,
              padding: 0
            }}
            title="Toggle Theme">
            {theme === "dark" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
          <div
            style={{
              padding: "6px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex"
            }}>
            <img
              src={iconBase64}
              alt="Sigil"
              style={{ width: "20px", height: "20px", borderRadius: "4px" }}
            />
          </div>
        </div>
      </div>

      {/* Agent Selector */}
      {agents.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              fontSize: "11px",
              color: colors.textMuted,
              marginBottom: "8px",
              display: "block",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
            Active Agent
          </label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedAgentId || ""}
              onChange={(e) => {
                const newAgentId = e.target.value
                setSelectedAgentId(newAgentId)
                chrome.storage.local.set({ active_agent_id: newAgentId })
              }}
              style={{
                width: "100%",
                padding: "14px 16px",
                paddingRight: "40px",
                borderRadius: "10px",
                border: `2px solid ${colors.border}`,
                backgroundColor: colors.cardBg,
                color: colors.text,
                fontSize: "15px",
                fontFamily: "inherit",
                fontWeight: "600",
                cursor: "pointer",
                outline: "none",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                transition: "all 0.15s ease",
                boxShadow: `0 2px 8px ${theme === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.08)"}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6"
                e.currentTarget.style.boxShadow = `0 4px 12px ${theme === "dark" ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.15)"}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border
                e.currentTarget.style.boxShadow = `0 2px 8px ${theme === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.08)"}`
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6"
                e.currentTarget.style.boxShadow = `0 0 0 3px ${theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}`
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border
                e.currentTarget.style.boxShadow = `0 2px 8px ${theme === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.08)"}`
              }}>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.status === "running" ? "🟢" : "🔴"} {agent.name}{" "}
                  {agent.name === "sigil" ? "(Main)" : ""} •{" "}
                  {agent.pubkey.slice(0, 4)}...{agent.pubkey.slice(-4)}
                </option>
              ))}
            </select>
            <div
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: colors.textMuted,
                display: "flex",
                alignItems: "center"
              }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderRadius: "99px",
          backgroundColor: colors.hover,
          border: `1px solid ${colors.border}`,
          width: "fit-content",
          marginBottom: "16px"
        }}>
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor:
              theme === "dark"
                ? "rgba(139, 92, 246, 0.15)"
                : "rgba(139, 92, 246, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: "bold",
              color: "#8b5cf6",
              textTransform: "uppercase"
            }}>
            {agentName ? agentName[0] : "A"}
          </span>
        </div>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "capitalize"
          }}>
          {agentName || "Active Agent"}
        </span>
        <span
          style={{
            width: "1px",
            height: "12px",
            backgroundColor: colors.border
          }}></span>
        <code
          style={{
            fontSize: "11px",
            color: colors.textMuted,
            fontFamily: "monospace"
          }}>
          {mainPubkey
            ? `${mainPubkey.slice(0, 4)}...${mainPubkey.slice(-4)}`
            : "Not connected"}
        </code>
      </div>

      <div style={{ marginBottom: "8px" }}>
        <p
          style={{
            margin: "0 0 4px 0",
            fontSize: "14px",
            color: colors.textMuted,
            fontWeight: "500"
          }}>
          Account Value
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "36px",
            fontWeight: "900",
            letterSpacing: "-0.02em"
          }}>
          {portfolio
            ? `${portfolio.sol.toFixed(4)} SOL`
            : isConnected
              ? "0.0000 SOL"
              : "—"}
        </h1>
      </div>
    </div>
  )

  // Default popup view replacing WalletView
  if (!requestObj) {
    return (
      <div
        style={{
          width: "400px",
          minHeight: "600px",
          boxSizing: "border-box",
          fontFamily: "sans-serif",
          backgroundColor: colors.bg,
          color: colors.text,
          padding: "0",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s",
          overflow: "hidden",
          position: "relative"
        }}>
        {renderNotConnected()}
        {renderHeader()}

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative"
          }}>
          {/* Tabs */}
          <div style={{ padding: "0 24px 8px 24px", marginTop: "12px" }}>
            <div
              style={{
                display: "flex",
                padding: "2px",
                backgroundColor: colors.btnBg,
                borderRadius: "8px"
              }}>
              <button
                onClick={() => setActiveTab("portfolio")}
                style={{
                  flex: 1,
                  padding: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  backgroundColor:
                    activeTab === "portfolio" ? colors.bg : "transparent",
                  color:
                    activeTab === "portfolio" ? colors.text : colors.textMuted,
                  boxShadow:
                    activeTab === "portfolio"
                      ? "0 1px 2px rgba(0,0,0,0.1)"
                      : "none"
                }}>
                Assets
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                style={{
                  flex: 1,
                  padding: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  backgroundColor:
                    activeTab === "transactions" ? colors.bg : "transparent",
                  color:
                    activeTab === "transactions"
                      ? colors.text
                      : colors.textMuted,
                  boxShadow:
                    activeTab === "transactions"
                      ? "0 1px 2px rgba(0,0,0,0.1)"
                      : "none"
                }}>
                Activity
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            style={{ padding: "0 24px 24px 24px", flex: 1, overflowY: "auto" }}>
            {activeTab === "portfolio" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    margin: "16px 0 8px 0"
                  }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: colors.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      margin: 0
                    }}>
                    Balances
                  </h3>
                </div>

                {isPortfolioLoading ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      paddingTop: "8px"
                    }}>
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "8px"
                        }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            backgroundColor: colors.btnBg,
                            animation: "pulse 1.5s ease-in-out infinite"
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              width: "80px",
                              height: "14px",
                              borderRadius: "4px",
                              backgroundColor: colors.btnBg,
                              marginBottom: "6px",
                              animation: "pulse 1.5s ease-in-out infinite"
                            }}
                          />
                          <div
                            style={{
                              width: "40px",
                              height: "10px",
                              borderRadius: "4px",
                              backgroundColor: colors.btnBg,
                              animation: "pulse 1.5s ease-in-out infinite"
                            }}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              width: "60px",
                              height: "14px",
                              borderRadius: "4px",
                              backgroundColor: colors.btnBg,
                              animation: "pulse 1.5s ease-in-out infinite"
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
                  </div>
                ) : (
                  <>
                    {/* SOL Card */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px",
                        margin: "0 -8px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = colors.hover)
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px"
                        }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background:
                              "linear-gradient(to bottom right, #a855f7, #3b82f6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: "12px"
                          }}>
                          S
                        </div>
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "14px",
                              fontWeight: "600"
                            }}>
                            Solana
                          </h3>
                          <p
                            style={{
                              margin: "2px 0 0 0",
                              fontSize: "12px",
                              color: colors.textMuted,
                              textTransform: "uppercase"
                            }}>
                            SOL
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: "600"
                          }}>
                          {portfolio ? portfolio.sol.toFixed(4) : "0.00"} SOL
                        </h3>
                        <p
                          style={{
                            margin: "2px 0 0 0",
                            fontSize: "12px",
                            color: colors.textMuted
                          }}>
                          Devnet
                        </p>
                      </div>
                    </div>

                    {/* Tokens Map */}
                    {portfolio?.tokens?.map?.(
                      (token: TokenAccount, i: number) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px",
                            margin: "8px -8px 0 -8px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            transition: "background 0.2s"
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              colors.hover)
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px"
                            }}>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                background:
                                  "linear-gradient(to bottom right, #4b5563, #374151)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: "bold",
                                fontSize: "12px"
                              }}>
                              SPL
                            </div>
                            <div>
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  maxWidth: "120px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}>
                                {token.mint.slice(0, 8)}...
                              </h3>
                              <p
                                style={{
                                  margin: "2px 0 0 0",
                                  fontSize: "12px",
                                  color: colors.textMuted,
                                  textTransform: "uppercase"
                                }}>
                                Token
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                fontWeight: "600"
                              }}>
                              {token.balance} Tkns
                            </h3>
                          </div>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "transactions" && (
              <div>
                {isTransactionsLoading ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginTop: "16px"
                    }}>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px",
                          borderRadius: "8px",
                          backgroundColor: colors.btnBg,
                          border: `1px solid ${colors.border}`
                        }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px"
                          }}>
                          <div
                            style={{
                              width: "80px",
                              height: "13px",
                              borderRadius: "4px",
                              backgroundColor: colors.hover,
                              animation: "pulse 1.5s ease-in-out infinite"
                            }}
                          />
                          <div
                            style={{
                              width: "120px",
                              height: "11px",
                              borderRadius: "4px",
                              backgroundColor: colors.hover,
                              animation: "pulse 1.5s ease-in-out infinite"
                            }}
                          />
                        </div>
                        <div
                          style={{
                            width: "100px",
                            height: "11px",
                            borderRadius: "4px",
                            backgroundColor: colors.hover,
                            animation: "pulse 1.5s ease-in-out infinite"
                          }}
                        />
                      </div>
                    ))}
                    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
                  </div>
                ) : transactions.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "32px 0",
                      color: colors.textMuted,
                      fontSize: "14px"
                    }}>
                    No recent activity found.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      marginTop: "16px"
                    }}>
                    {transactions.map((tx: Transaction, i: number) => {
                      const isFailed = !!tx.err
                      const isFinalized = tx.status === "finalized"
                      const statusColor = isFailed
                        ? "#ef4444"
                        : isFinalized
                          ? "#10b981"
                          : "#f59e0b"
                      const statusBg = isFailed
                        ? "rgba(239, 68, 68, 0.1)"
                        : isFinalized
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(245, 158, 11, 0.1)"

                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "10px",
                            borderRadius: "10px",
                            backgroundColor: colors.btnBg,
                            border: `1px solid ${colors.border}`,
                            transition: "background 0.2s"
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              colors.hover)
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              colors.btnBg)
                          }>
                          <div
                            style={{
                              padding: "8px",
                              backgroundColor: colors.hover,
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                            <ArrowUpRight
                              style={{
                                width: "14px",
                                height: "14px",
                                color: colors.textMuted
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px"
                              }}>
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  fontFamily: "monospace",
                                  color: colors.textMuted,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}>
                                {tx.signature.slice(0, 8)}...
                                {tx.signature.slice(-4)}
                              </span>
                              <a
                                href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  color: colors.textMuted
                                }}>
                                <ExternalLink
                                  style={{ width: "12px", height: "12px" }}
                                />
                              </a>
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: colors.textMuted,
                                marginTop: "2px"
                              }}>
                              {tx.blockTime
                                ? new Date(tx.blockTime).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" }
                                  )
                                : "Pending"}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: statusBg,
                              color: statusColor,
                              fontSize: "10px",
                              fontWeight: "bold",
                              textTransform: "capitalize"
                            }}>
                            {isFailed ? "failed" : tx.status || "confirmed"}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Sign Transaction view perfectly matches Transaction Detail Modal inside the Wallet View envelope
  if (requestObj?.type === "signTransaction") {
    const sim = simulationData || requestObj.simulationData
    const riskLevel = sim?.riskLevel || "HIGH"
    const riskColor =
      riskLevel === "LOW"
        ? "#10b981"
        : riskLevel === "MEDIUM"
          ? "#f59e0b"
          : "#ef4444"
    const riskBg =
      riskLevel === "LOW"
        ? "rgba(16, 185, 129, 0.05)"
        : riskLevel === "MEDIUM"
          ? "rgba(245, 158, 11, 0.05)"
          : "rgba(239, 68, 68, 0.05)"
    const riskBorder =
      riskLevel === "LOW"
        ? "rgba(16, 185, 129, 0.2)"
        : riskLevel === "MEDIUM"
          ? "rgba(245, 158, 11, 0.2)"
          : "rgba(239, 68, 68, 0.2)"
    const riskLabel =
      riskLevel === "LOW"
        ? "Low Risk"
        : riskLevel === "MEDIUM"
          ? "Medium Risk"
          : "High Risk"

    return (
      <div
        style={{
          padding: 0,
          margin: 0,
          width: "100%",
          height: "100vh",
          boxSizing: "border-box",
          fontFamily: "sans-serif",
          backgroundColor: colors.bg,
          color: colors.text,
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s",
          overflow: "hidden"
        }}>
        <div
          style={{
            padding: "20px 20px 16px 20px",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <div>
            <h2 style={{ fontSize: "18px", margin: "0", fontWeight: "bold" }}>
              Transaction Details
            </h2>
            <code
              style={{
                fontSize: "12px",
                color: colors.textMuted,
                fontFamily: "monospace",
                marginTop: "4px",
                display: "block"
              }}>
              {requestObj?.origin || "Unknown dApp"}
            </code>
          </div>
          <div
            style={{
              backgroundColor: colors.btnBg,
              padding: "4px 8px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "bold",
              color: colors.textMuted,
              whiteSpace: "nowrap"
            }}>
            Signature Request
          </div>
        </div>

        {/* Show which agent will sign */}
        {(() => {
          const currentAgent = agents.find((a) => a.id === selectedAgentId)
          return (
            currentAgent && (
              <div
                style={{
                  margin: "16px 20px 0 20px",
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor:
                    theme === "dark"
                      ? "rgba(59, 130, 246, 0.1)"
                      : "rgba(59, 130, 246, 0.05)",
                  border: "1px solid rgba(59, 130, 246, 0.3)"
                }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px"
                  }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor:
                        currentAgent.status === "running"
                          ? "#22c55e"
                          : "#ef4444",
                      boxShadow: `0 0 8px ${currentAgent.status === "running" ? "#22c55e" : "#ef4444"}`
                    }}
                  />
                  <span
                    style={{
                      fontWeight: "700",
                      color: colors.text,
                      fontSize: "12px",
                      textTransform: "uppercase"
                    }}>
                    Signing Agent
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px"
                  }}>
                  <span
                    style={{
                      color: colors.textMuted,
                      fontSize: "11px",
                      fontWeight: "600"
                    }}>
                    Name
                  </span>
                  <span
                    style={{
                      color: colors.text,
                      fontSize: "11px",
                      fontWeight: "600"
                    }}>
                    {currentAgent.name}{" "}
                    {currentAgent.name === "sigil" ? "(Main)" : ""}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between"
                  }}>
                  <span
                    style={{
                      color: colors.textMuted,
                      fontSize: "11px",
                      fontWeight: "600"
                    }}>
                    Wallet
                  </span>
                  <code
                    style={{
                      color: colors.text,
                      fontFamily: "monospace",
                      fontSize: "10px"
                    }}>
                    {currentAgent.pubkey.slice(0, 8)}...
                    {currentAgent.pubkey.slice(-8)}
                  </code>
                </div>
              </div>
            )
          )
        })()}

        <div
          style={{
            flex: 1,
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column"
          }}>
          {isSimulating ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: `3px solid ${colors.border}`,
                  borderTopColor: "#8b5cf6",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}
              />
              <p
                style={{
                  marginTop: "16px",
                  color: colors.textMuted,
                  fontSize: "14px",
                  fontWeight: "500"
                }}>
                Agent is analyzing transaction...
              </p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {/* Agent Analysis Grid Match */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "16px",
                  marginBottom: "20px"
                }}>
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: riskBg,
                    border: `1px solid ${riskBorder}`,
                    borderRadius: "8px"
                  }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px"
                    }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: colors.textMuted,
                        textTransform: "uppercase",
                        fontWeight: "500"
                      }}>
                      Agent Risk Assessment
                    </p>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: riskColor,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: riskBg,
                        border: `1px solid ${riskBorder}`,
                        textTransform: "uppercase"
                      }}>
                      {riskLabel}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: theme === "dark" ? "#d4d4d8" : "#3f3f46",
                      lineHeight: "1.5",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap"
                    }}>
                    {sim?.analysis ||
                      "The agent could not analyze this transaction."}
                  </p>
                </div>
                {sim?.error && (
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "8px"
                    }}>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "12px",
                        color: "#fca5a5",
                        textTransform: "uppercase",
                        fontWeight: "500"
                      }}>
                      Error
                    </p>
                    <code
                      style={{
                        fontSize: "12px",
                        color: "#fca5a5",
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                        whiteSpace: "pre-wrap"
                      }}>
                      {sim.error}
                    </code>
                  </div>
                )}
              </div>

              {/* Instructions / Raw Data section equivalent */}
              <div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: colors.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "8px"
                  }}>
                  Raw Payload
                </h3>
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: colors.btnBg,
                    borderRadius: "8px",
                    border: `1px solid ${colors.border}`
                  }}>
                  <details>
                    <summary
                      style={{
                        fontSize: "12px",
                        fontWeight: "500",
                        color: colors.textMuted,
                        cursor: "pointer",
                        userSelect: "none"
                      }}>
                      View Developer Details
                    </summary>
                    <div
                      style={{
                        marginTop: "8px",
                        paddingLeft: "8px",
                        borderLeft: `2px solid ${colors.border}`
                      }}>
                      <pre
                        style={{
                          fontSize: "10px",
                          fontFamily: "monospace",
                          color: colors.textMuted,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all"
                        }}>
                        {typeof requestObj.transactionMessage === "string"
                          ? requestObj.transactionMessage
                          : JSON.stringify(
                              requestObj.transactionMessage,
                              null,
                              2
                            )}
                      </pre>
                    </div>
                  </details>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
            display: "flex",
            gap: "12px",
            zIndex: 10
          }}>
          <button
            onClick={() =>
              resolveRequest(null, "User rejected the transaction.")
            }
            disabled={isSigning || isSimulating}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.cardBg,
              color: colors.text,
              cursor: isSigning || isSimulating ? "not-allowed" : "pointer",
              fontWeight: "bold",
              transition: "background 0.2s",
              opacity: isSigning || isSimulating ? 0.5 : 1
            }}>
            Reject
          </button>
          <button
            onClick={() => resolveRequest({ approved: true })}
            disabled={isSigning || isSimulating}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: isSimulating ? colors.border : "#16a34a",
              color: isSimulating && theme === "light" ? "#000" : "#fff",
              cursor: isSigning || isSimulating ? "not-allowed" : "pointer",
              fontWeight: "bold",
              transition: "opacity 0.2s",
              opacity: isSigning || isSimulating ? 0.7 : 1
            }}>
            {isSigning ? "Signing..." : "Sign Transaction"}
          </button>
        </div>
      </div>
    )
  }

  return null
}
