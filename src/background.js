// background service worker (Manifest v3)
// Use this file to perform long-lived tasks, maintain state, or respond to action clicks.

console.log('[HLTV Helper] background service worker started');

// Example: listen for a message from popup and forward to the active tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'scan-page') {
    // forward to current active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'do-scan'});
        sendResponse({status: 'sent'});
      } else {
        sendResponse({status: 'no-tab'});
      }
    });
    // return true to indicate we will call sendResponse asynchronously
    return true;
  }
});
