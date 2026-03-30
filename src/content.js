// Minimal content script: hides booster overlays when enabled in storage
const BOOSTER_SELECTORS = ['.booster-trigger-container', '.booster-trigger-rate-container'];
const DATA_ATTR = 'data-hltv-booster-hidden';
const STORAGE_KEY = 'hltvBoosterEnabled';
const STYLE_ID = 'hltv-booster-blocker-style';

let enabled = true;

function hideBoosterOnce() {
  // Prefer using a style element to hide boosters globally and reliably
  let style = document.getElementById(STYLE_ID);
  if (style) return; // already applied
  style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = BOOSTER_SELECTORS.join(', ') + ' { display: none !important; }';
  (document.head || document.documentElement).appendChild(style);
  console.log('[HLTV Helper] applied hide style for boosters');
}

function restoreHidden() {
  const style = document.getElementById(STYLE_ID);
  if (style) {
    style.parentNode.removeChild(style);
    console.log('[HLTV Helper] removed hide style for boosters');
  } else {
    console.log('[HLTV Helper] no hide style found to remove');
  }
}

console.log('[HLTV Helper] content script loaded');

// Initialize enabled flag from storage (default true)
if (chrome && chrome.storage && chrome.storage.sync) {
  chrome.storage.sync.get({[STORAGE_KEY]: true}, (result) => {
    enabled = !!result[STORAGE_KEY];
    console.log('[HLTV Helper] initial enabled=', enabled);
    if (enabled) hideBoosterOnce(); else restoreHidden();
  });

  // React to remote toggle changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (changes[STORAGE_KEY]) {
      const newVal = !!changes[STORAGE_KEY].newValue;
      console.log('[HLTV Helper] storage change', STORAGE_KEY, '->', newVal);
      enabled = newVal;
      if (enabled) {
        hideBoosterOnce();
      } else {
        restoreHidden();
      }
    }
  });

  // Also listen for direct messages from the popup for immediate toggles
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
      if (!msg || msg.type !== 'hltvBoosterToggle') return;
      const newVal = !!msg.enabled;
      console.log('[HLTV Helper] runtime message toggle ->', newVal);
      enabled = newVal;
      if (enabled) hideBoosterOnce(); else restoreHidden();
      if (sendResp) sendResp({status: 'ok'});
    });
  }
}

// Observe DOM and hide boosters when they appear if enabled
new MutationObserver(() => {
  if (enabled) hideBoosterOnce();
}).observe(document.body, {childList: true, subtree: true});

