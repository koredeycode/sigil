import { config } from "../core/config.js"

export {}

const SIGIL_SERVER_URL = config.SERVER_URL

/**
 * Read the stored auth token from chrome.storage.local.
 */
function getStoredToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sigil_auth_token"], (result) => {
      resolve(result.sigil_auth_token || null)
    })
  })
}

/**
 * Build headers object with Authorization if a token is stored.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getStoredToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

// Background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(
    "[Sigil Background] Received message:",
    request,
    "from sender:",
    sender
  )
  const { method, params } = request

  // ─── Token Management ────────────────────────────────────────────────

  if (method === "get_token") {
    getStoredToken().then((token) => {
      sendResponse({ result: { token } })
    })
    return true
  }

  if (method === "set_token") {
    const token = params?.token
    if (!token) {
      sendResponse({ error: "Token is required" })
      return true
    }

    // Validate the token against the server before storing
    fetch(`${SIGIL_SERVER_URL}/api/wallet/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          sendResponse({ error: data.message || "Invalid token" })
          return
        }
        chrome.storage.local.set({ sigil_auth_token: token }, () => {
          console.log("[Sigil Background] Auth token stored successfully.")
          sendResponse({ result: { valid: true } })
        })
      })
      .catch((err) => {
        sendResponse({ error: "Failed to validate token: " + err.message })
      })
    return true
  }

  if (method === "clear_token") {
    chrome.storage.local.remove(["sigil_auth_token"], () => {
      console.log("[Sigil Background] Auth token cleared.")
      sendResponse({ result: { cleared: true } })
    })
    return true
  }

  // ─── dApp Requests ───────────────────────────────────────────────────

  if (method === "connect") {
    const requestId = Date.now().toString()
    const origin = sender.origin || sender.tab?.url || "Unknown dApp"
    console.log(
      `[Sigil Background] Processing 'connect' for origin: ${origin}, requestId: ${requestId}`
    )

    chrome.storage.local.set(
      {
        [`request_${requestId}`]: { type: "connect", origin }
      },
      () => {
        console.log(
          `[Sigil Background] Saved request_${requestId} to storage. Opening popup...`
        )
        chrome.windows.create({
          url: `popup.html?request=${requestId}`,
          type: "popup",
          width: 360,
          height: 600
        })
      }
    )

    // Listen for the popup's response
    const listener = (msg: any) => {
      if (msg.type === "resolve_request" && msg.requestId === requestId) {
        chrome.runtime.onMessage.removeListener(listener)
        if (msg.error) {
          sendResponse({ error: msg.error })
        } else {
          sendResponse({ result: msg.data })
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)

    return true // indicates asynchronous response
  }

  if (method === "signTransaction") {
    const requestId = Date.now().toString()
    const transactionMessage = params.transactionMessage
    const origin = sender.origin || sender.tab?.url || "Unknown dApp"

    // 1. Store transaction data and open popup immediately
    chrome.storage.local.set(
      {
        [`request_${requestId}`]: {
          type: "signTransaction",
          origin,
          transactionMessage
        }
      },
      () => {
        chrome.windows.create({
          url: `popup.html?request=${requestId}`,
          type: "popup",
          width: 360,
          height: 650
        })
      }
    )

    // 2. Wait for popup user approval/rejection
    const listener = (msg: any) => {
      if (msg.type === "resolve_request" && msg.requestId === requestId) {
        chrome.runtime.onMessage.removeListener(listener)
        if (msg.error) {
          sendResponse({ error: msg.error })
        } else {
          sendResponse({ result: msg.data })
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)

    return true
  }

  // Handle local state checks (for default popup viewing)
  if (method === "get_status") {
    getAuthHeaders().then((headers) => {
      fetch(`${SIGIL_SERVER_URL}/api/status`, { headers })
        .then((res) => res.json())
        .then((data) => sendResponse({ result: data }))
        .catch((err) => sendResponse({ error: err.message }))
    })
    return true
  }
})

// ─── Agent Switch Detection ──────────────────────────────────────────────────

// Listen for active agent changes and notify all tabs
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.active_agent_id) {
    const newAgentId = changes.active_agent_id.newValue
    console.log(`[Sigil Background] Active agent changed to: ${newAgentId}`)

    // Get the new agent's public key
    chrome.storage.local.get(["active_agent_id"], async (result) => {
      const agentId = result.active_agent_id
      if (!agentId) return

      try {
        const headers = await getAuthHeaders()
        const response = await fetch(
          `${SIGIL_SERVER_URL}/api/wallet/provider/connect`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ agentId })
          }
        )

        if (response.ok) {
          const data = await response.json()
          const publicKey = data.data?.publicKey

          if (publicKey) {
            // Notify all tabs about the account change
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach((tab) => {
                if (tab.id) {
                  chrome.tabs
                    .sendMessage(tab.id, {
                      target: "sigil-content",
                      method: "accountChanged",
                      data: { publicKey }
                    })
                    .catch(() => {
                      // Tab might not have content script, ignore
                    })
                }
              })
            })
          }
        }
      } catch (error) {
        console.error(
          "[Sigil Background] Failed to fetch new agent pubkey:",
          error
        )
      }
    })
  }
})

console.log("Sigil Background Script Loaded.")
