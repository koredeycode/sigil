import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
};

// Listen to messages from the page (inpage.ts)
window.addEventListener("message", (event) => {
  // Only accept messages from same frame
  if (event.source !== window || event.data?.target !== "sigil-content") {
    return;
  }

  // Forward to Background Script
  chrome.runtime.sendMessage(
    {
      method: event.data.method,
      params: event.data.params,
    },
    (response) => {
      // Send response back to inpage.ts
      window.postMessage(
        {
          target: "sigil-inpage",
          id: event.data.id,
          result: response?.result,
          error: response?.error,
        },
        "*"
      );
    }
  );
});

// Optionally, listen to push events from background to send to page natively (events like disconnect)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target === "sigil-content") {
      window.postMessage(
        {
          target: "sigil-inpage",
          method: message.method,
          ...message.data
        },
        "*"
      );
    }
});
