// Minimal content script: hides booster overlays when enabled in storage
const BOOSTER_SELECTORS = ['.booster-trigger-container', '.booster-trigger-rate-container'];
const DATA_ATTR = 'data-hltv-booster-hidden';
const STORAGE_KEY = 'hltvBoosterEnabled';
const STYLE_ID = 'hltv-booster-blocker-style';
const COMPACT_MODE_SELECTOR = '.booster-compact-mode-player-right';

let enabled = true;

function hideBoosterOnce() {
  // Prefer using a style element to hide boosters globally and reliably
  let style = document.getElementById(STYLE_ID);
  if (style) return; // already applied
  style = document.createElement('style');
  style.id = STYLE_ID;
  // include the compact mode selector so side rates are also hidden by the same style
  style.textContent = BOOSTER_SELECTORS.join(', ') + ', ' + COMPACT_MODE_SELECTOR + ' { display: none !important; }';
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

// NOTE: compact mode selector is hidden via the same STYLE_ID as other boosters
// so we don't need a separate observer that unconditionally hides it.

// toggleVisibility and on-page toggle were removed — visibility is controlled
// by the popup (via storage/runtime messages) and the global injected style.

console.log('[HLTV Helper] content script loaded');

// Initialize enabled flag from storage (default true)
if (chrome && chrome.storage && chrome.storage.sync) {
  chrome.storage.sync.get({[STORAGE_KEY]: true}, (result) => {
    enabled = !!result[STORAGE_KEY];
    console.log('[HLTV Helper] initial enabled=', enabled);
    if (enabled) hideBoosterOnce(); else restoreHidden();
    // No on-page toggle: popup/storage controls the global style. Nothing else to sync.
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

