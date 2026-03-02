export { };

const SIGIL_SERVER_URL = "http://127.0.0.1:7445";

// Background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Sigil Background] Received message:", request, "from sender:", sender);
  const { method, params } = request;

  if (method === "connect") {
    const requestId = Date.now().toString();
    const origin = sender.origin || sender.tab?.url || "Unknown dApp";
    console.log(`[Sigil Background] Processing 'connect' for origin: ${origin}, requestId: ${requestId}`);

    chrome.storage.local.set({ 
       [`request_${requestId}`]: { type: "connect", origin }
    }, () => {
       console.log(`[Sigil Background] Saved request_${requestId} to storage. Opening popup...`);
       chrome.windows.create({
          url: `popup.html?request=${requestId}`,
          type: "popup",
          width: 360,
          height: 600
       });
    });

    // Listen for the popup's response
    const listener = (msg: any) => {
       if (msg.type === "resolve_request" && msg.requestId === requestId) {
          chrome.runtime.onMessage.removeListener(listener);
          if (msg.error) {
              sendResponse({ error: msg.error });
          } else {
              sendResponse({ result: msg.data });
          }
       }
    };
    chrome.runtime.onMessage.addListener(listener);

    return true; // indicates asynchronous response
  }

  if (method === "signTransaction") {
    const requestId = Date.now().toString();
    const transactionMessage = params.transactionMessage;
    const origin = sender.origin || sender.tab?.url || "Unknown dApp";

    // 1. Store transaction data and open popup immediately
    chrome.storage.local.set({ 
       [`request_${requestId}`]: { 
           type: "signTransaction", 
           origin, 
           transactionMessage 
       }
    }, () => {
       chrome.windows.create({
          url: `popup.html?request=${requestId}`,
          type: "popup",
          width: 360,
          height: 650
       });
    });

    // 2. Wait for popup user approval/rejection
    const listener = (msg: any) => {
       if (msg.type === "resolve_request" && msg.requestId === requestId) {
          chrome.runtime.onMessage.removeListener(listener);
          if (msg.error) {
              sendResponse({ error: msg.error });
          } else {
              sendResponse({ result: msg.data });
          }
       }
    };
    chrome.runtime.onMessage.addListener(listener);

    return true;
  }

  // Handle local state checks (for default popup viewing)
  if (method === "get_status") {
      fetch(`${SIGIL_SERVER_URL}/api/status`)
        .then(res => res.json())
        .then(data => sendResponse({ result: data }))
        .catch(err => sendResponse({ error: err.message }));
      return true;
  }
});

console.log("Sigil Background Script Loaded.");
