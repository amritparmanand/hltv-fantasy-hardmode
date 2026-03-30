console.log('[HLTV Helper] popup script loaded');
  const STORAGE_KEY = 'hltvBoosterEnabled';

function initPopup() {
  console.log('[HLTV Helper] popup init start');
  const toggle = document.getElementById('toggle');
  const STORAGE_KEY = 'hltvBoosterEnabled';

  console.log('[HLTV Helper] popup found toggle=', !!toggle);

  // initialize state if toggle exists
  if (!toggle) {
    console.warn('[HLTV Helper] popup toggle element not found; popup.js will no-op');
    return;
  }

  // initialize state
  if (chrome && chrome.storage && chrome.storage.sync) {
    console.log('[HLTV Helper] popup storage available');
    chrome.storage.sync.get({[STORAGE_KEY]: true}, (res) => {
      try {
        toggle.checked = !!res[STORAGE_KEY];
        console.log('[HLTV Helper] popup initial state=', toggle.checked);
      } catch (err) {
        console.error('[HLTV Helper] error setting toggle.checked', err);
      }
    });

    toggle.addEventListener('change', () => {
        console.log('[HLTV Helper] toggle change event triggered');
        const val = !!toggle.checked;

        // Helper to persist and notify content scripts
        const applyToggle = () => {
          if (chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({[STORAGE_KEY]: val});
            console.log('[HLTV Helper] popup set state=', val);
          } else {
            console.warn('[HLTV Helper] chrome.storage.sync is unavailable; state not persisted');
          }

          // Also send a direct message to the active tab so content script updates immediately
          if (chrome && chrome.tabs && chrome.tabs.query && chrome.tabs.sendMessage) {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              if (tabs && tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {type: 'hltvBoosterToggle', enabled: val}, (resp) => {
                  if (chrome.runtime.lastError) {
                    // content script may not be present on that tab; ignore
                    console.debug('[HLTV Helper] popup: sendMessage error', chrome.runtime.lastError.message);
                  } else {
                    console.log('[HLTV Helper] popup: message sent to tab', tabs[0].id);
                  }
                });
              } else {
                console.debug('[HLTV Helper] popup: no active tab to message');
              }
            });
          }
        };

        // If enabling, ensure we have host permission for HLTV (optional permission flow)
        if (val && chrome && chrome.permissions && chrome.permissions.contains) {
          const origins = ['*://*.hltv.org/*'];
          chrome.permissions.contains({origins}, (has) => {
            if (has) {
              applyToggle();
            } else if (chrome.permissions.request) {
              // ask the user for permission to access HLTV pages
              chrome.permissions.request({origins}, (granted) => {
                if (granted) {
                  console.log('[HLTV Helper] HLTV host permission granted');
                  applyToggle();
                } else {
                  console.warn('[HLTV Helper] HLTV host permission denied by user');
                  // revert toggle in UI since permission was denied
                  try { toggle.checked = false; } catch (e) {}
                  // still persist false
                  if (chrome && chrome.storage && chrome.storage.sync) chrome.storage.sync.set({[STORAGE_KEY]: false});
                }
              });
            } else {
              // permissions.request not available? apply anyway
              applyToggle();
            }
          });
        } else {
          // disabling or permissions APIs not available -> just apply
          applyToggle();
        }
    });
  } else {
    console.warn('[HLTV Helper] chrome.storage.sync is unavailable; toggle state will not persist');
    toggle.checked = true;
    toggle.addEventListener('change', () => {
      console.log('[HLTV Helper] toggle change event triggered but no storage available');
    });
  }
  console.log('[HLTV Helper] popup init done');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  // DOM already ready
  initPopup();
}
document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const scanBtn = document.getElementById('scan');
  const blockBtn = document.getElementById('block');
  const clearBtn = document.getElementById('clear-blocks');
  const selectorInput = document.getElementById('selector');
  const storageKey = 'hltvBlockers';

  const setStatus = (text, isError = false) => {
    if (!statusEl) {
      console.warn('[HLTV Helper] status element not found; skipping status update');
      return;
    }
    statusEl.textContent = text;
    statusEl.style.color = isError ? 'crimson' : '';
  };

  const sendCommandToTab = (message) => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs || !tabs[0]) {
        setStatus('No active tab found', true);
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, message, (resp) => {
        if (chrome.runtime.lastError) {
          setStatus('Error: ' + chrome.runtime.lastError.message, true);
          return;
        }
        if (resp && resp.status === 'blocked') {
          setStatus('Selector blocked');
        }
      });
    });
  };

  const persistSelector = (selector) => {
    chrome.storage.sync.get({[storageKey]: []}, (result) => {
      const existing = result[storageKey] || [];
      if (existing.includes(selector)) {
        return;
      }
      chrome.storage.sync.set({[storageKey]: [...existing, selector]});
    });
  };

  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      setStatus('Sending scan command...');
      chrome.runtime.sendMessage({type: 'scan-page'}, () => {
        if (chrome.runtime.lastError) {
          setStatus('Error: ' + chrome.runtime.lastError.message, true);
          return;
        }
        setTimeout(() => setStatus('Ready'), 1500);
        setStatus('Scan command sent');
      });
    });
  }

  if (blockBtn) {
    blockBtn.addEventListener('click', () => {
      const selector = (selectorInput && selectorInput.value) ? selectorInput.value.trim() : '';
      if (!selector) {
        setStatus('Enter a CSS selector to block', true);
        return;
      }

      setStatus('Blocking ' + selector);
      sendCommandToTab({type: 'block-element', selector});
      persistSelector(selector);
      setTimeout(() => setStatus('Ready'), 1500);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      setStatus('Clearing stored selectors...');
      chrome.storage.sync.remove(storageKey, () => {
        sendCommandToTab({type: 'clear-blocks'});
        setTimeout(() => setStatus('Ready'), 1500);
      });
    });
  }
});
