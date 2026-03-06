import type { PlasmoCSConfig } from "plasmo"
import inpageUrl from "url:../core/inpage.ts"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_start"
}

console.log(
  "[Sigil Extension] Isolated content script successfully running. Injecting provider..."
)

// Bridge messages from the webpage (MAIN world) to the background script (ISOLATED world)
window.addEventListener("message", (event) => {
  // Only accept messages from the same window
  if (
    event.source !== window ||
    !event.data ||
    event.data.target !== "sigil-content"
  ) {
    return
  }

  // Forward to background script
  chrome.runtime.sendMessage(
    {
      method: event.data.method,
      params: event.data.params
    },
    (response) => {
      // Forward response back to the webpage
      window.postMessage(
        {
          target: "sigil-inpage",
          id: event.data.id,
          result: response?.result,
          error: response?.error
        },
        window.location.origin
      )
    }
  )
})

// Also listen for messages from the background script to the webpage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "sigil-content") {
    console.log("[Sigil Content] Forwarding message to inpage:", message)
    window.postMessage(
      {
        target: "sigil-inpage",
        method: message.method,
        data: message.data
      },
      window.location.origin
    )
  }
})

try {
  const script = document.createElement("script")
  script.src = inpageUrl.startsWith("chrome-extension://")
    ? inpageUrl
    : chrome.runtime.getURL(inpageUrl)
  script.onload = () => script.remove()
  ;(document.head || document.documentElement).appendChild(script)
} catch (e) {
  console.error("[Sigil Extension] Failed to inject provider script:", e)
}
